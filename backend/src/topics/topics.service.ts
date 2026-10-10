import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { EvidenceScoringService } from '../evidence-scoring/evidence-scoring.service';
import { ReputationService } from '../users/reputation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QuotaService } from '../common/quota.service';
import { EvidenceReportsService } from './evidence-reports.service';
import { TopicsGateway } from './topics.gateway';
import { CreateTopicDto } from './dto/create-topic.dto';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ListTopicsDto } from './dto/list-topics.dto';
import { ModerateTopicDto, ModerationAction } from './dto/moderate-topic.dto';

@Injectable()
export class TopicsService {
  constructor(
    private prisma: PrismaService,
    private evidenceScoringService: EvidenceScoringService,
    private reputation: ReputationService,
    private gateway: TopicsGateway,
    private notifications: NotificationsService,
    private quota: QuotaService,
    private evidenceReports: EvidenceReportsService,
  ) {}

  async create(creatorId: string, dto: CreateTopicDto) {
    await this.quota.assertWithinQuota(creatorId, 'topics');
    const topic = await this.prisma.topic.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        creatorId,
        sides: {
          create: [
            { position: 'A', label: dto.sideALabel },
            { position: 'B', label: dto.sideBLabel },
          ],
        },
      },
      include: { sides: true },
    });

    await this.notifications.topicPendingReview(topic.id, topic.title, creatorId);

    return topic;
  }

  /**
   * Taraf gucu: nicelik degil kalite kazanmali.
   *
   * Eski model toplam puani kullaniyordu; bu, 2 adet 45'lik vasat kaniti
   * 1 adet 90'lik saglam kanitin onune geciriyordu. Yani taraf, daha iyi
   * kanit sunarak degil daha COK kanit yigarak kazanabiliyordu. Bu, urunun
   * "dogrulanabilir olan kazanir" vaadiyle dogrudan celisiyordu.
   *
   * Yeni model, notr bir baslangica (50) dogru cekilen agirlikli ortalama
   * kullanir:  guc = (puanlarin toplami + PRIOR_WEIGHT * 50) / (n + PRIOR_WEIGHT)
   *
   * - Kalite belirleyicidir: 2x45 -> 47, 1x90 -> 63. Saglam kanit kazanir.
   * - Tek kanitla gelen uc ortalamalar yumusatilir, boylece tek sansli
   *   kanitla dava kazanmak zorlasir; taraf guvenini kanit sayisiyla da
   *   pekistirmelidir.
   * - Vasat kanit yigmak ortalamayi dusurdugu icin spam cezalandirilir.
   */
  private static readonly PRIOR_WEIGHT = 2;
  private static readonly PRIOR_SCORE = 50;

  private withScores<
    T extends {
      sides: { id: string; position: string; label: string; evidences?: { score: number | null }[] }[];
    },
  >(topic: T) {
    const sides = topic.sides.map((side) => {
      const evidences = side.evidences ?? [];
      const scored = evidences.filter((e) => typeof e.score === 'number');
      const totalScore = scored.reduce((sum, e) => sum + (e.score as number), 0);

      /**
       * Guc, kanit yokken de tanimlidir: on bilgi tek basina notr 50 verir.
       * Eskiden null donuyordu ve arayuzde kanitsiz taraf bos gorunuyordu;
       * oysa "henuz kanit yok, notr" bilgisi kullaniciya bos kutudan daha
       * fazlasini anlatir. Ortalama ise kanit yoksa gercekten tanimsizdir,
       * o null kalir.
       */
      const strengthScore = Math.round(
        (totalScore + TopicsService.PRIOR_WEIGHT * TopicsService.PRIOR_SCORE) /
          (scored.length + TopicsService.PRIOR_WEIGHT),
      );

      return {
        ...side,
        evidenceCount: evidences.length,
        scoredCount: scored.length,
        totalScore,
        averageScore: scored.length ? Math.round(totalScore / scored.length) : null,
        strengthScore,
      };
    });

    const best = [...sides].sort((a, b) => (b.strengthScore ?? -1) - (a.strengthScore ?? -1));
    const isTie = best.length > 1 && best[0].strengthScore === best[1].strengthScore;
    const hasAnyScore = sides.some((s) => s.scoredCount > 0);

    return {
      ...topic,
      sides,
      leadingSideId: !hasAnyScore || isTie ? null : best[0].id,
      isTie: hasAnyScore && isTie,
    };
  }

  async findApproved(query: ListTopicsDto = {}) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 50) : 10;
    const search = query.q?.trim();

    const where: any = { status: 'APPROVED' };
    if (query.category?.trim()) {
      where.category = { equals: query.category.trim(), mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sides: { some: { label: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const orderBy =
      query.sort === 'old'
        ? { createdAt: 'asc' as const }
        : query.sort === 'active'
          ? { updatedAt: 'desc' as const }
          : { createdAt: 'desc' as const };

    const [total, topics] = await Promise.all([
      this.prisma.topic.count({ where }),
      this.prisma.topic.findMany({
        where,
        include: {
          sides: { include: { evidences: { select: { score: true } } } },
          _count: { select: { comments: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: topics.map((topic: any) => {
        const { _count, ...rest } = topic;
        return { ...this.withScores(rest), commentCount: _count?.comments ?? 0 };
      }),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async listCategories() {
    const rows = await this.prisma.topic.groupBy({
      by: ['category'],
      where: { status: 'APPROVED' },
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
    });

    return rows.map((r) => ({ category: r.category, count: r._count.category }));
  }

  async findPending() {
    return this.prisma.topic.findMany({
      where: { status: 'PENDING' },
      include: { sides: true, creator: { select: { username: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string, viewerId?: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: {
        sides: {
          include: {
            evidences: {
              orderBy: { score: 'desc' },
              include: {
                author: { select: { username: true, displayName: true } },
                votes: viewerId
                  ? { where: { userId: viewerId }, select: { value: true } }
                  : false,
                _count: { select: { votes: true } },
              },
            },
          },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException('Konu bulunamadi.');
    }

    const evidenceIds = topic.sides.flatMap((s) => s.evidences.map((e) => e.id));
    const voteSums = evidenceIds.length
      ? await this.prisma.evidenceVote.groupBy({
          by: ['evidenceId'],
          where: { evidenceId: { in: evidenceIds } },
          _sum: { value: true },
        })
      : [];
    const sumByEvidence = new Map(voteSums.map((v) => [v.evidenceId, v._sum.value ?? 0]));
    const reportCounts = await this.evidenceReports.summaryFor(evidenceIds);
    const myReports =
      viewerId && evidenceIds.length
        ? new Set(
            (
              await this.prisma.evidenceReport.findMany({
                where: { evidenceId: { in: evidenceIds }, reporterId: viewerId },
                select: { evidenceId: true },
              })
            ).map((row) => row.evidenceId),
          )
        : new Set<string>();

    const withVotes = {
      ...topic,
      sides: topic.sides.map((side) => ({
        ...side,
        evidences: side.evidences.map((evidence: any) => {
          const { votes, _count, ...rest } = evidence;
          return {
            ...rest,
            voteScore: sumByEvidence.get(evidence.id) ?? 0,
            voteCount: _count?.votes ?? 0,
            myVote: Array.isArray(votes) && votes.length ? votes[0].value : 0,
            reportCount: reportCounts.get(evidence.id) ?? 0,
            myReported: myReports.has(evidence.id),
          };
        }),
      })),
    };

    return this.withScores(withVotes);
  }

  async voteEvidence(evidenceId: string, userId: string, value: number) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      select: { id: true, authorId: true, side: { select: { topicId: true } } },
    });

    if (!evidence) {
      throw new NotFoundException('Kanit bulunamadi.');
    }

    if (evidence.authorId === userId) {
      throw new BadRequestException('Kendi kanitina oy veremezsin.');
    }

    if (value === 0) {
      await this.prisma.evidenceVote.deleteMany({ where: { evidenceId, userId } });
    } else {
      await this.prisma.evidenceVote.upsert({
        where: { evidenceId_userId: { evidenceId, userId } },
        create: { evidenceId, userId, value },
        update: { value },
      });
    }

    const [sum, count] = await Promise.all([
      this.prisma.evidenceVote.aggregate({
        where: { evidenceId },
        _sum: { value: true },
      }),
      this.prisma.evidenceVote.count({ where: { evidenceId } }),
    ]);

    await this.reputation.recalculate(evidence.authorId);

    const result = {
      evidenceId,
      voteScore: sum._sum.value ?? 0,
      voteCount: count,
      myVote: value,
    };
    this.gateway.emitTopicEvent(evidence.side.topicId, 'evidence:voted', result);
    return result;
  }

  async listComments(topicId: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      select: { id: true },
    });
    if (!topic) {
      throw new NotFoundException('Konu bulunamadi.');
    }

    const comments = await this.prisma.comment.findMany({
      where: { topicId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, username: true, displayName: true } },
      },
    });

    const visible = comments.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      content: c.isDeleted ? null : c.content,
      isDeleted: c.isDeleted,
      createdAt: c.createdAt,
      author: c.isDeleted ? null : c.author,
    }));

    const byId = new Map(visible.map((c) => [c.id, { ...c, replies: [] as any[] }]));
    const roots: any[] = [];
    for (const c of byId.values()) {
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId)!.replies.push(c);
      } else {
        roots.push(c);
      }
    }

    return roots;
  }

  /**
   * Onay beklerken dava sahibi kendi dosyasini kurabilir.
   *
   * Neden: eskiden tum PENDING konular kanit eklemeye kapaliydi. Sonuc olarak
   * yeni kullanici kaydolup dava aciyor, sonra kendi davasina tek bir kanit
   * bile ekleyemiyordu - moderator onaylayana kadar akis tamamen tikaniyordu.
   * Boylece moderator de bos bir dava inceliyordu.
   *
   * Yeni kural: APPROVED ise herkese acik. PENDING ise yalnizca sahibi (ve
   * yonetim) ekleyebilir; dava herkese hala ancak onaydan sonra gorunur.
   * REJECTED her durumda kapali.
   */
  private assertCanContribute(
    topic: { status: string; creatorId: string },
    userId: string,
    userRole: string | undefined,
    action: 'evidence' | 'comment',
  ) {
    if (topic.status === 'APPROVED') return;

    const isStaff = userRole === 'ADMIN' || userRole === 'MODERATOR';
    const isOwner = topic.creatorId === userId;

    if (topic.status === 'PENDING' && (isOwner || isStaff)) return;

    if (topic.status === 'REJECTED') {
      throw new BadRequestException(
        action === 'evidence'
          ? 'Bu dava reddedildigi icin delil eklenemez.'
          : 'Bu dava reddedildigi icin yorum yapilamaz.',
      );
    }

    throw new BadRequestException(
      action === 'evidence'
        ? 'Bu dava henuz onaylanmadi. Onaylanana kadar yalnizca davayi acan kisi delil ekleyebilir.'
        : 'Bu dava henuz onaylanmadi. Onaylanana kadar yalnizca davayi acan kisi yorum yapabilir.',
    );
  }

  async addComment(topicId: string, authorId: string, dto: CreateCommentDto, authorRole?: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      select: { id: true, status: true, title: true, creatorId: true },
    });
    if (!topic) {
      throw new NotFoundException('Konu bulunamadi.');
    }
    this.assertCanContribute(topic, authorId, authorRole, 'comment');

    let parentAuthorId: string | null = null;
    await this.quota.assertWithinQuota(authorId, 'comments');
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { id: true, topicId: true, parentId: true, authorId: true },
      });
      if (!parent || parent.topicId !== topicId) {
        throw new BadRequestException('Yanit verilen yorum bu konuya ait degil.');
      }
      if (parent.parentId) {
        throw new BadRequestException('Yanitlara yanit verilemez.');
      }
      parentAuthorId = parent.authorId;
    }

    const comment = await this.prisma.comment.create({
      data: {
        topicId,
        authorId,
        content: dto.content,
        parentId: dto.parentId ?? null,
      },
      include: {
        author: { select: { id: true, username: true, displayName: true } },
      },
    });

    const result = { ...comment, replies: [] };
    this.gateway.emitTopicEvent(topicId, 'comment:created', result);

    // Yanit verilen kisi ve dava sahibi bilgilendirilir; kendi eylemi icin bildirim gitmez.
    if (parentAuthorId && parentAuthorId !== authorId) {
      await this.notifications.commentReply(parentAuthorId, topicId, topic.title);
    }
    if (topic.creatorId !== authorId && topic.creatorId !== parentAuthorId) {
      await this.notifications.topicComment(topic.creatorId, topicId, topic.title);
    }

    return result;
  }

  async deleteComment(commentId: string, user: { id: string; role: string }) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, isDeleted: true },
    });
    if (!comment) {
      throw new NotFoundException('Yorum bulunamadi.');
    }

    const isModerator = user.role === 'ADMIN' || user.role === 'MODERATOR';
    if (comment.authorId !== user.id && !isModerator) {
      throw new ForbiddenException('Bu yorumu silme yetkin yok.');
    }

    if (!comment.isDeleted) {
      await this.prisma.comment.update({
        where: { id: commentId },
        data: { isDeleted: true },
      });
    }

    return { id: commentId, isDeleted: true };
  }

  /**
   * Tek bir kaniti yeniden AI degerlendirmesine sokar.
   * Puanlama prompt'u degistiginde eski kanitlari guncellemek icin gerekli.
   */
  async rescoreEvidence(evidenceId: string) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      select: { id: true },
    });
    if (!evidence) {
      throw new NotFoundException('Kanit bulunamadi.');
    }
    await this.evidenceScoringService.enqueueScoring(evidenceId);
    return { evidenceId, queued: true };
  }

  /**
   * Eski puanlama modeliyle islenmis (qualityBreakdown bos) veya hic
   * puanlanmamis tum kanitlari yeniden kuyruga alir.
   */
  async rescoreStaleEvidences() {
    const stale = await this.prisma.evidence.findMany({
      where: { OR: [{ qualityBreakdown: { equals: Prisma.DbNull } }, { score: null }] },
      select: { id: true },
    });

    for (const evidence of stale) {
      await this.evidenceScoringService.enqueueScoring(evidence.id);
    }

    return { queued: stale.length, evidenceIds: stale.map((e) => e.id) };
  }

  async moderate(topicId: string, dto: ModerateTopicDto) {
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      throw new NotFoundException('Konu bulunamadi.');
    }

    const statusMap = {
      [ModerationAction.APPROVE]: 'APPROVED',
      [ModerationAction.REJECT]: 'REJECTED',
      [ModerationAction.REQUEST_REVISION]: 'NEEDS_REVISION',
    } as const;

    const updated = await this.prisma.topic.update({
      where: { id: topicId },
      data: {
        status: statusMap[dto.action],
        moderationNote: dto.note ?? null,
      },
    });

    await this.notifications.topicModerated(
      topic.creatorId,
      topicId,
      topic.title,
      dto.action === ModerationAction.APPROVE,
    );

    return updated;
  }

  async addEvidence(sideId: string, authorId: string, dto: CreateEvidenceDto, authorRole?: string) {
    const side = await this.prisma.side.findUnique({
      where: { id: sideId },
      include: { topic: true },
    });

    if (!side) {
      throw new NotFoundException('Taraf bulunamadi.');
    }

    this.assertCanContribute(side.topic, authorId, authorRole, 'evidence');

    await this.quota.assertWithinQuota(authorId, 'evidences');

    const evidence = await this.prisma.evidence.create({
      data: {
        sideId,
        authorId,
        content: dto.content,
        sourceUrl: dto.sourceUrl,
      },
    });

    await this.evidenceScoringService.enqueueScoring(evidence.id);
    this.gateway.emitTopicEvent(side.topic.id, 'evidence:created', evidence);

    return evidence;
  }
}
