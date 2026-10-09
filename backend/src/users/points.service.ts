import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from '../common/quota.service';
import { Prisma } from '@prisma/client';

export type PointReason = 'evidence_score';

@Injectable()
export class PointsService {
  constructor(
    private prisma: PrismaService,
    private quota: QuotaService,
  ) {}

  /** Idempotent setter: repeating an event changes no balance. */
  async set(
    userId: string,
    delta: number,
    reason: PointReason,
    sourceKey: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.pointTransaction.findUnique({ where: { sourceKey } });
      const previous = existing?.delta ?? 0;
      const difference = delta - previous;

      if (existing) {
        if (difference !== 0) {
          await tx.pointTransaction.update({
            where: { sourceKey },
            data: { delta, reason, metadata },
          });
          await tx.user.update({
            where: { id: userId },
            data: { pointsBalance: { increment: difference } },
          });
        }
        return { ...existing, delta };
      }

      const transaction = await tx.pointTransaction.create({
        data: { userId, delta, reason, sourceKey, metadata },
      });
      if (delta !== 0) {
        await tx.user.update({
          where: { id: userId },
          data: { pointsBalance: { increment: delta } },
        });
      }
      return transaction;
    });
  }

  async setEvidenceScore(userId: string, evidenceId: string, score: number) {
    const earned = score >= 90 ? 20 : score >= 80 ? 12 : score >= 70 ? 8 : score >= 60 ? 4 : 0;
    const sourceKey = `evidence-score:${evidenceId}`;

    // Ayni kanit yeniden puanlandiginda tavan tekrar uygulanmaz; sadece
    // ilk kez puan verilirken gunluk tavan dikkate alinir.
    const existing = await this.prisma.pointTransaction.findUnique({
      where: { sourceKey },
      select: { id: true },
    });
    const points = existing ? earned : await this.quota.capDailyPoints(userId, earned);

    return this.set(userId, points, 'evidence_score', sourceKey, {
      evidenceId,
      score,
      earnedBeforeDailyCap: earned,
    });
  }
}
