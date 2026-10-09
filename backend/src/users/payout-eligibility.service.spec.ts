import { describe, expect, it, vi } from 'vitest';
import { PayoutEligibilityService, PAYOUT_RULES } from './payout-eligibility.service';

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

function buildService(
  user: Record<string, unknown> | null,
  scored: { count: number; avg: number | null },
) {
  const prisma = {
    user: { findUnique: vi.fn().mockResolvedValue(user) },
    evidence: {
      aggregate: vi.fn().mockResolvedValue({
        _count: { _all: scored.count },
        _avg: { score: scored.avg },
      }),
    },
  };
  return new PayoutEligibilityService(prisma as never);
}

const eligibleUser = {
  id: 'u1',
  createdAt: daysAgo(60),
  pointsBalance: 900,
  isEmailVerified: true,
  isBanned: false,
  isPremium: true,
  premiumUntil: daysAgo(-30),
  country: 'TR',
};

describe('PayoutEligibilityService', () => {
  it('tum sartlar saglandiginda uygun sayar', async () => {
    const service = buildService(eligibleUser, { count: 15, avg: 82 });
    const result = await service.check('u1');

    expect(result.eligible).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.pointsBalance).toBe(900);
  });

  it('tek bir sart eksikse uygun saymaz', async () => {
    const service = buildService(
      { ...eligibleUser, pointsBalance: PAYOUT_RULES.minPointsBalance - 1 },
      { count: 15, avg: 82 },
    );
    const result = await service.check('u1');

    expect(result.eligible).toBe(false);
    expect(result.missing).toHaveLength(1);
    expect(result.requirements.find((r) => r.key === 'pointsBalance')?.met).toBe(false);
  });

  it('suresi gecmis abonelik aktif sayilmaz', async () => {
    const service = buildService(
      { ...eligibleUser, premiumUntil: daysAgo(1) },
      { count: 15, avg: 82 },
    );
    const result = await service.check('u1');

    expect(result.requirements.find((r) => r.key === 'premium')?.met).toBe(false);
    expect(result.eligible).toBe(false);
  });

  it('desteklenmeyen ulke uygunlugu engeller', async () => {
    const service = buildService({ ...eligibleUser, country: 'XX' }, { count: 15, avg: 82 });
    const result = await service.check('u1');

    expect(result.requirements.find((r) => r.key === 'country')?.met).toBe(false);
  });

  it('dusuk ortalama kalite uygunlugu engeller', async () => {
    const service = buildService(eligibleUser, {
      count: 15,
      avg: PAYOUT_RULES.minAverageQuality - 5,
    });
    const result = await service.check('u1');

    expect(result.requirements.find((r) => r.key === 'averageQuality')?.met).toBe(false);
    expect(result.eligible).toBe(false);
  });

  it('yeni hesap uygun olamaz', async () => {
    const service = buildService({ ...eligibleUser, createdAt: daysAgo(3) }, { count: 15, avg: 90 });
    const result = await service.check('u1');

    expect(result.requirements.find((r) => r.key === 'accountAge')?.current).toBe(3);
    expect(result.eligible).toBe(false);
  });

  it('banli hesap uygun olamaz', async () => {
    const service = buildService({ ...eligibleUser, isBanned: true }, { count: 15, avg: 90 });
    const result = await service.check('u1');

    expect(result.requirements.find((r) => r.key === 'notBanned')?.met).toBe(false);
  });

  it('kullanici yoksa uygun saymaz', async () => {
    const service = buildService(null, { count: 0, avg: null });
    const result = await service.check('missing');

    expect(result.eligible).toBe(false);
    expect(result.pointsBalance).toBe(0);
  });

  it('puanlanmamis kanitlar ortalamayi sifir yapar', async () => {
    const service = buildService(eligibleUser, { count: 0, avg: null });
    const result = await service.check('u1');

    expect(result.requirements.find((r) => r.key === 'averageQuality')?.current).toBe(0);
    expect(result.requirements.find((r) => r.key === 'scoredEvidence')?.current).toBe(0);
  });
});
