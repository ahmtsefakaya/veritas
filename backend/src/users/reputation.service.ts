import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Itibar puani hesabi.
 *
 * Formul:
 *   itibar = toplam(AI delil puani) / 10  +  net oy * 2
 *
 * Gerekce: AI puani icerigin niteligini olcer (0-100), oylar toplulugun
 * degerlendirmesini. AI puani 10'a bolunur ki 100'luk tek bir delil 10 puan
 * getirsin; bir net oy 2 puan eder, yani 5 oy bir mukemmel delile denk.
 * Negatif oylar puani dusurur, toplam asla 0'in altina inmez.
 */
@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name);

  constructor(private prisma: PrismaService) {}

  async computeFor(userId: string): Promise<number> {
    const [scoreAgg, voteAgg] = await Promise.all([
      this.prisma.evidence.aggregate({
        where: { authorId: userId, score: { not: null } },
        _sum: { score: true },
      }),
      this.prisma.evidenceVote.aggregate({
        where: { evidence: { authorId: userId } },
        _sum: { value: true },
      }),
    ]);

    const fromScores = (scoreAgg._sum.score ?? 0) / 10;
    const fromVotes = (voteAgg._sum.value ?? 0) * 2;

    return Math.max(0, Math.round(fromScores + fromVotes));
  }

  async recalculate(userId: string): Promise<number> {
    const reputationScore = await this.computeFor(userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: { reputationScore },
    });

    return reputationScore;
  }

  /** Bir kanitin yazarinin itibarini tazeler; hata uygulamayi durdurmaz. */
  async recalculateForEvidence(evidenceId: string): Promise<void> {
    try {
      const evidence = await this.prisma.evidence.findUnique({
        where: { id: evidenceId },
        select: { authorId: true },
      });
      if (evidence) {
        await this.recalculate(evidence.authorId);
      }
    } catch (error) {
      this.logger.error(`Itibar guncellenemedi (kanit ${evidenceId}): ${error}`);
    }
  }

  async stats(userId: string) {
    const [evidenceCount, scoredAgg, voteAgg, topicCount, commentCount, best] = await Promise.all([
      this.prisma.evidence.count({ where: { authorId: userId } }),
      this.prisma.evidence.aggregate({
        where: { authorId: userId, score: { not: null } },
        _avg: { score: true },
        _count: { score: true },
      }),
      this.prisma.evidenceVote.aggregate({
        where: { evidence: { authorId: userId } },
        _sum: { value: true },
        _count: true,
      }),
      this.prisma.topic.count({ where: { creatorId: userId, status: 'APPROVED' } }),
      this.prisma.comment.count({ where: { authorId: userId, isDeleted: false } }),
      this.prisma.evidence.findMany({
        where: { authorId: userId, score: { not: null } },
        orderBy: { score: 'desc' },
        take: 5,
        select: {
          id: true,
          content: true,
          score: true,
          sourceUrl: true,
          createdAt: true,
          side: {
            select: {
              label: true,
              position: true,
              topic: { select: { id: true, title: true, status: true } },
            },
          },
        },
      }),
    ]);

    return {
      evidenceCount,
      scoredEvidenceCount: scoredAgg._count.score ?? 0,
      averageScore: scoredAgg._avg.score !== null ? Math.round(scoredAgg._avg.score) : null,
      netVotes: voteAgg._sum.value ?? 0,
      voteCount: voteAgg._count ?? 0,
      topicCount,
      commentCount,
      bestEvidences: best.filter((e) => e.side.topic.status === 'APPROVED'),
    };
  }
}
