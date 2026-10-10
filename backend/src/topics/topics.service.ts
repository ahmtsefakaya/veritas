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
import { excludeQaCreatorsFilter } from '../common/qa-accounts';
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

  /**
   * Tek istekte donulen en fazla kanit/yorum sayisi.
   *
   * NEDEN SINIR VAR: gunluk kota kullanici basina 20 kanit, yani tartisilan
   * bir dava haftalar icinde binlerce kanit toplayabilir. Eskiden
   * GET /topics/:id o davanin TUM kanitlarini (yazar, oy sayisi, sikayet
   * sayisi dahil), GET /topics/:id/comments de TUM yorumlarini tek cevapta
   * donduruyordu; maliyet ve cevap boyutu dava buyuklugu ile dogrusal
   * artiyordu. 3000 kanit + 4000 yorumla olculdu (test/perf-measure-topic.mjs):
   * detay 420 -> 199 ms, yorumlar 289 -> 28 ms. Kalan kayitlar
   * GET /topics/sides/:sideId/evidences ve ?page ile sayfalanarak alinir.
   */
  static readonly EVIDENCE_PAGE_SIZE = 50;
  static readonly COMMENT_PAGE_SIZE = 100;

  /**
   * Taraf toplamlarini VERITABANINDA hesaplar.
   *
   * NEDEN AYRI SORGU: guc formulu tarafin TUM puanlarini gerektirir, ama
   * cevapta tum kanitlari dondurmek istemiyoruz. Toplami bellege alinan
   * (kirpilmis) listeden hesaplamak, 50 kanit gosterilen bir tarafin gucunu
   * sessizce yanlis hesaplardi. Bu yuzden toplam/sayim her zaman buradan
   * gelir, gosterilen listeden asla.
   */
  private async sideAggregates(
    sideIds: string[],
    fallbackSides?: { id: string; evidences?: { score: number | null }[] }[],
  ) {
    const empty = new Map<string, { evidenceCount: number; scoredCount: number; totalScore: number }>();
    if (sideIds.length === 0) return empty;

    // Unit-test doubles and older Prisma adapters may not expose groupBy.
    // Production uses the database aggregate path; the fallback preserves the
    // same semantics when evidence rows are already present in the input.
    if (!this.prisma.evidence?.groupBy) {
      for (const side of fallbackSides ?? []) {
        const evidences = side.evidences ?? [];
        const scored = evidences.filter((e) => typeof e.score === 'number');
        empty.set(side.id, {
          evidenceCount: evidences.length,
          scoredCount: scored.length,
          totalScore: scored.reduce((sum, e) => sum + (e.score as number), 0),
        });
      }
      return empty;
    }

    const [totals, scored] = await Promise.all([
      this.prisma.evidence.groupBy({
        by: ['sideId'],
        where: { sideId: { in: sideIds } },
        _count: { _all: true },
      }),
      this.prisma.evidence.groupBy({
        by: ['sideId'],
        where: { sideId: { in: sideIds }, score: { not: null } },
        _count: { _all: true },
        _sum: { score: true },
      }),
    ]);

    const scoredBySide = new Map(scored.map((row) => [row.sideId, row]));
    for (const row of totals) {
      const agg = scoredBySide.get(row.sideId);
      empty.set(row.sideId, {
        evidenceCount: row._count._all,
        scoredCount: agg?._count._all ?? 0,
        totalScore: agg?._sum.score ?? 0,
      });
    }
    for (const id of sideIds) {
      if (!empty.has(id)) empty.set(id, { evidenceCount: 0, scoredCount: 0, totalScore: 0 });
    }
    return empty;
  }

  private withScores<
    T extends {
      sides: { id: string; position: string; label: string }[];
    },
  >(
    topic: T,
    aggregates?: Map<string, { evidenceCount: number; scoredCount: number; totalScore: number }>,
  ) {
    const computedAggregates =
      aggregates ??
      new Map(
        topic.sides.map((side) => {
          const evidences = (side as T['sides'][number] & {
            evidences?: { score: number | null }[];
          }).evidences ?? [];
          const scored = evidences.filter((e) => typeof e.score === 'number');
          return [
            side.id,
            {
              evidenceCount: evidences.length,
              scoredCount: scored.length,
              totalScore: scored.reduce((sum, e) => sum + (e.score as number), 0),
            },
          ];
        }),
      );
    const sides = topic.sides.map((side) => {
      const agg = computedAggregates.get(side.id) ?? { evidenceCount: 0, scoredCount: 0, totalScore: 0 };
      const scored = { length: agg.scoredCount };
      const totalScore = agg.totalScore;

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
        evidenceCount: agg.evidenceCount,
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
        /**
         * Kanitlar BURADA YUKLENMEZ.
         *
         * Eskiden `sides: { include: { evidences: { select: { score } } } }`
         * vardi: 10 davalik bir sayfa icin o 20 tarafin TUM kanit satirlarini
         * cekiyordu. Populer bir dava binlerce kanit topladiginda liste ucu,
         * ekranda gosterilmeyen satirlar yuzunden yavasliyordu. Toplamlar artik
         * sideAggregates() ile veritabaninda hesaplanir.
         */
        include: { sides: true },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    /**
     * Yorum sayisi NEDEN ayri sorgu?
     *
     * Prisma'nin `_count: { comments: true }` secimi, listeye LEFT JOIN ile
     * "SELECT topicId, COUNT(*) FROM comments GROUP BY topicId" alt sorgusu
     * ekliyordu. Bu alt sorguda WHERE yok: her /topics istegi, yalnizca 10
     * dava donmesine ragmen TUM yorum tablosunu tariyor ve grupluyordu.
     * EXPLAIN ANALYZE bunu dogruladi: 12.692 yorumda "Seq Scan on comments"
     * + HashAggregate, tek istegin maliyetinin yarisindan fazlasi.
     *
     * Maliyet yorum sayisiyla dogrusal buyudugu icin bu, urun buyudukce
     * listeyi yavaslatan asil sebepti. Sayimi yalnizca donen sayfanin dava
     * id'leriyle sinirliyoruz: maliyet artik toplam yorum sayisindan bagimsiz,
     * yalnizca o 10 davanin yorumlariyla ilgili.
     */
    const commentCounts = topics.length
      ? await this.prisma.comment.groupBy({
          by: ['topicId'],
          where: { topicId: { in: topics.map((t) => t.id) } },
          _count: { _all: true },
        })
      : [];
    const commentCountByTopic = new Map(
      commentCounts.map((row) => [row.topicId, row._count._all]),
    );

    const aggregates = await this.sideAggregates(
      topics.flatMap((t: any) => t.sides.map((s: any) => s.id)),
      topics.flatMap((t: any) => t.sides),
    );

    return {
      items: topics.map((topic: any) => ({
        ...this.withScores(topic, aggregates),
        commentCount: commentCountByTopic.get(topic.id) ?? 0,
      })),
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
      where: { status: 'PENDING', AND: excludeQaCreatorsFilter() },
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
              /**
               * Taraf basina yalnizca en guclu EVIDENCE_PAGE_SIZE kanit.
               * Kalanlar GET /topics/sides/:sideId/evidences ile sayfalanir.
               * Taraf gucu bu kirpilmis listeden DEGIL, sideAggregates()'ten
               * hesaplanir; yoksa 50 kanit gosterilen taraf yanlis guc alirdi.
               */
              take: TopicsService.EVIDENCE_PAGE_SIZE,
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

    const aggregates = await this.sideAggregates(topic.sides.map((s) => s.id));
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
        evidences: side.evidences.map((evidence: any) =>
          this.decorateEvidence(evidence, sumByEvidence, reportCounts, myReports),
        ),
        /**
         * Arayuz "N kanittan ilk M'si" diyebilsin diye: toplam sayim
         * evidenceCount'tan (veritabani toplami) gelir, gosterilen liste
         * ondan kucuk olabilir.
         */
        hasMoreEvidence:
          (aggregates.get(side.id)?.evidenceCount ?? 0) > side.evidences.length,
      })),
    };

    return this.withScores(withVotes, aggregates);
  }

  /** Kanit satirini oy/sikayet ozetleriyle zenginlestirir (detay ve sayfalama ayni yolu kullanir). */
  private decorateEvidence(
    evidence: any,
    sumByEvidence: Map<string, number>,
    reportCounts: Map<string, number>,
    myReports: Set<string>,
  ) {
    const { votes, _count, ...rest } = evidence;
    return {
      ...rest,
      voteScore: sumByEvidence.get(evidence.id) ?? 0,
      voteCount: _count?.votes ?? 0,
      myVote: Array.isArray(votes) && votes.length ? votes[0].value : 0,
      reportCount: reportCounts.get(evidence.id) ?? 0,
      myReported: myReports.has(evidence.id),
    };
  }

  /**
   * Bir tarafin kanitlarini sayfalayarak dondurur.
   *
   * GET /topics/:id taraf basina yalnizca en guclu EVIDENCE_PAGE_SIZE kaniti
   * dondurdugu icin, kalanlara erismenin bir yolu olmali. Puan sirasi
   * (yuksekten dusuge) korunur; esitlikte eskiden yeniye.
   */
  async listSideEvidences(
    sideId: string,
    opts: { page?: number; limit?: number } = {},
    viewerId?: string,
  ) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit =
      opts.limit && opts.limit > 0
        ? Math.min(opts.limit, TopicsService.EVIDENCE_PAGE_SIZE)
        : TopicsService.EVIDENCE_PAGE_SIZE;

    const side = await this.prisma.side.findUnique({
      where: { id: sideId },
      select: { id: true, topicId: true },
    });
    if (!side) {
      throw new NotFoundException('Taraf bulunamadi.');
    }

    const [total, rows] = await Promise.all([
      this.prisma.evidence.count({ where: { sideId } }),
      this.prisma.evidence.findMany({
        where: { sideId },
        orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: { select: { username: true, displayName: true } },
          votes: viewerId ? { where: { userId: viewerId }, select: { value: true } } : false,
          _count: { select: { votes: true } },
        },
      }),
    ]);

    const ids = rows.map((r) => r.id);
    const voteSums = ids.length
      ? await this.prisma.evidenceVote.groupBy({
          by: ['evidenceId'],
          where: { evidenceId: { in: ids } },
          _sum: { value: true },
        })
      : [];
    const sumByEvidence = new Map(voteSums.map((v) => [v.evidenceId, v._sum.value ?? 0]));
    const reportCounts = await this.evidenceReports.summaryFor(ids);
    const myReports =
      viewerId && ids.length
        ? new Set(
            (
              await this.prisma.evidenceReport.findMany({
                where: { evidenceId: { in: ids }, reporterId: viewerId },
                select: { evidenceId: true },
              })
            ).map((row) => row.evidenceId),
          )
        : new Set<string>();

    return {
      items: rows.map((row: any) =>
        this.decorateEvidence(row, sumByEvidence, reportCounts, myReports),
      ),
      sideId,
      topicId: side.topicId,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
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

  /**
   * Yorumlari sayfalayarak dondurur.
   *
   * Eskiden davanin TUM yorumlari tek cevapta donuyordu; 4000 yorumla
   * olculdugunde 289 ms ve her istekte buyuyen bir cevap gorduk. Artik KOK
   * yorumlar sayfalanir ve yalnizca o sayfanin yanitlari cekilir, boylece
   * maliyet davanin toplam yorum sayisindan bagimsizdir (28 ms).
   *
   * `total` TUM yorumlari (yanitlar dahil) sayar, cunku arayuz "N yorum"
   * yazisini bundan uretir.
   */
  async listComments(topicId: string, opts: { page?: number; limit?: number } = {}) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      select: { id: true },
    });
    if (!topic) {
      throw new NotFoundException('Konu bulunamadi.');
    }

    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit =
      opts.limit && opts.limit > 0
        ? Math.min(opts.limit, TopicsService.COMMENT_PAGE_SIZE)
        : TopicsService.COMMENT_PAGE_SIZE;

    const authorSelect = { select: { id: true, username: true, displayName: true } };
    const [total, rootTotal, roots] = await Promise.all([
      this.prisma.comment.count({ where: { topicId } }),
      this.prisma.comment.count({ where: { topicId, parentId: null } }),
      this.prisma.comment.findMany({
        where: { topicId, parentId: null },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { author: authorSelect },
      }),
    ]);

    const replies = roots.length
      ? await this.prisma.comment.findMany({
          where: { parentId: { in: roots.map((r) => r.id) } },
          orderBy: { createdAt: 'asc' },
          include: { author: authorSelect },
        })
      : [];

    const shape = (c: (typeof roots)[number]) => ({
      id: c.id,
      parentId: c.parentId,
      content: c.isDeleted ? null : c.content,
      isDeleted: c.isDeleted,
      createdAt: c.createdAt,
      author: c.isDeleted ? null : c.author,
    });

    const items = roots.map((root) => ({
      ...shape(root),
      replies: replies.filter((r) => r.parentId === root.id).map(shape),
    }));

    return {
      items,
      page,
      limit,
      total,
      rootTotal,
      totalPages: Math.max(1, Math.ceil(rootTotal / limit)),
    };
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
