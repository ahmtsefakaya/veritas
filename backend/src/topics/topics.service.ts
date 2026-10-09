import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvidenceScoringService } from '../evidence-scoring/evidence-scoring.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { ModerateTopicDto, ModerationAction } from './dto/moderate-topic.dto';

@Injectable()
export class TopicsService {
  constructor(
    private prisma: PrismaService,
    private evidenceScoringService: EvidenceScoringService,
  ) {}

  async create(creatorId: string, dto: CreateTopicDto) {
    return this.prisma.topic.create({
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
  }

  private withScores<
    T extends {
      sides: { id: string; position: string; label: string; evidences?: { score: number | null }[] }[];
    },
  >(topic: T) {
    const sides = topic.sides.map((side) => {
      const evidences = side.evidences ?? [];
      const scored = evidences.filter((e) => typeof e.score === 'number');
      const totalScore = scored.reduce((sum, e) => sum + (e.score as number), 0);
      return {
        ...side,
        evidenceCount: evidences.length,
        scoredCount: scored.length,
        totalScore,
        averageScore: scored.length ? Math.round(totalScore / scored.length) : null,
      };
    });

    const best = [...sides].sort((a, b) => b.totalScore - a.totalScore);
    const isTie = best.length > 1 && best[0].totalScore === best[1].totalScore;
    const hasAnyScore = sides.some((s) => s.scoredCount > 0);

    return {
      ...topic,
      sides,
      leadingSideId: !hasAnyScore || isTie ? null : best[0].id,
      isTie: hasAnyScore && isTie,
    };
  }

  async findApproved() {
    const topics = await this.prisma.topic.findMany({
      where: { status: 'APPROVED' },
      include: {
        sides: { include: { evidences: { select: { score: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return topics.map((topic) => this.withScores(topic));
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
          };
        }),
      })),
    };

    return this.withScores(withVotes);
  }

  async voteEvidence(evidenceId: string, userId: string, value: number) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      select: { id: true, authorId: true },
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

    return {
      evidenceId,
      voteScore: sum._sum.value ?? 0,
      voteCount: count,
      myVote: value,
    };
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

    return this.prisma.topic.update({
      where: { id: topicId },
      data: {
        status: statusMap[dto.action],
        moderationNote: dto.note ?? null,
      },
    });
  }

  async addEvidence(sideId: string, authorId: string, dto: CreateEvidenceDto) {
    const side = await this.prisma.side.findUnique({
      where: { id: sideId },
      include: { topic: true },
    });

    if (!side) {
      throw new NotFoundException('Taraf bulunamadi.');
    }

    if (side.topic.status !== 'APPROVED') {
      throw new BadRequestException('Bu konu henuz onaylanmadigi icin delil eklenemez.');
    }

    const evidence = await this.prisma.evidence.create({
      data: {
        sideId,
        authorId,
        content: dto.content,
        sourceUrl: dto.sourceUrl,
      },
    });

    await this.evidenceScoringService.enqueueScoring(evidence.id);

    return evidence;
  }
}
