import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Kullanici basina gunluk uretim kotalari.
 *
 * Gerekce: IP bazli rate limit (ThrottlerGuard) tek bir makineden gelen
 * sel saldirisini durdurur, ama farkli IP'lerden calisan bir bot agini
 * durdurmaz. Hesap bazli gunluk kota, puan toplamak icin icerik uretimini
 * otomatiklestirmeyi ekonomik olarak anlamsiz hale getirir.
 */
export const DAILY_QUOTAS = {
  topics: 5,
  evidences: 20,
  comments: 60,
  /** Bir gunde kazanilabilecek azami odul puani. */
  points: 100,
} as const;

export type QuotaKind = 'topics' | 'evidences' | 'comments';

@Injectable()
export class QuotaService {
  constructor(private prisma: PrismaService) {}

  private startOfToday() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  async assertWithinQuota(userId: string, kind: QuotaKind) {
    const since = this.startOfToday();
    const limit = DAILY_QUOTAS[kind];

    const used =
      kind === 'topics'
        ? await this.prisma.topic.count({ where: { creatorId: userId, createdAt: { gte: since } } })
        : kind === 'evidences'
          ? await this.prisma.evidence.count({
              where: { authorId: userId, createdAt: { gte: since } },
            })
          : await this.prisma.comment.count({
              where: { authorId: userId, createdAt: { gte: since } },
            });

    if (used >= limit) {
      const labels = { topics: 'dava', evidences: 'kanit', comments: 'yorum' } as const;
      throw new ForbiddenException(
        `Gunluk ${labels[kind]} limitine ulastiniz (${limit}). Yarin tekrar deneyin.`,
      );
    }

    return { used, limit, remaining: limit - used };
  }

  /** Bugun kazanilan odul puani toplami. */
  async pointsEarnedToday(userId: string) {
    const result = await this.prisma.pointTransaction.aggregate({
      where: { userId, createdAt: { gte: this.startOfToday() }, delta: { gt: 0 } },
      _sum: { delta: true },
    });
    return result._sum.delta ?? 0;
  }

  /**
   * Gunluk puan tavanini asmayacak sekilde verilebilecek puani dondurur.
   * Tavan dolduysa 0 doner; kanit kalite puani yine kaydedilir, sadece
   * odul puani o gun icin eklenmez.
   */
  async capDailyPoints(userId: string, requested: number) {
    if (requested <= 0) return 0;
    const earned = await this.pointsEarnedToday(userId);
    const remaining = DAILY_QUOTAS.points - earned;
    if (remaining <= 0) return 0;
    return Math.min(requested, remaining);
  }

  async usage(userId: string) {
    const since = this.startOfToday();
    const [topics, evidences, comments, points] = await Promise.all([
      this.prisma.topic.count({ where: { creatorId: userId, createdAt: { gte: since } } }),
      this.prisma.evidence.count({ where: { authorId: userId, createdAt: { gte: since } } }),
      this.prisma.comment.count({ where: { authorId: userId, createdAt: { gte: since } } }),
      this.pointsEarnedToday(userId),
    ]);

    return {
      topics: { used: topics, limit: DAILY_QUOTAS.topics },
      evidences: { used: evidences, limit: DAILY_QUOTAS.evidences },
      comments: { used: comments, limit: DAILY_QUOTAS.comments },
      points: { used: points, limit: DAILY_QUOTAS.points },
    };
  }
}
