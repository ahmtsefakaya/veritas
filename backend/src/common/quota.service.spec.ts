import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { QuotaService, DAILY_QUOTAS } from './quota.service';

function buildService(counts: {
  topics?: number;
  evidences?: number;
  comments?: number;
  pointsToday?: number;
}) {
  const prisma = {
    topic: { count: vi.fn().mockResolvedValue(counts.topics ?? 0) },
    evidence: { count: vi.fn().mockResolvedValue(counts.evidences ?? 0) },
    comment: { count: vi.fn().mockResolvedValue(counts.comments ?? 0) },
    pointTransaction: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { delta: counts.pointsToday ?? 0 } }),
    },
  };
  return { service: new QuotaService(prisma as never), prisma };
}

describe('QuotaService', () => {
  it('kota altindaysa kalan hakki dondurur', async () => {
    const { service } = buildService({ topics: 2 });
    const result = await service.assertWithinQuota('u1', 'topics');

    expect(result).toEqual({ used: 2, limit: DAILY_QUOTAS.topics, remaining: 3 });
  });

  it('kota dolduysa engeller', async () => {
    const { service } = buildService({ topics: DAILY_QUOTAS.topics });

    await expect(service.assertWithinQuota('u1', 'topics')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('kanit kotasi kanit sayacini kullanir', async () => {
    const { service, prisma } = buildService({ evidences: 1 });
    await service.assertWithinQuota('u1', 'evidences');

    expect(prisma.evidence.count).toHaveBeenCalled();
    expect(prisma.topic.count).not.toHaveBeenCalled();
  });

  it('yorum kotasi dolunca engeller', async () => {
    const { service } = buildService({ comments: DAILY_QUOTAS.comments + 5 });

    await expect(service.assertWithinQuota('u1', 'comments')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('gunluk puan tavani altinda tam puan verir', async () => {
    const { service } = buildService({ pointsToday: 10 });

    await expect(service.capDailyPoints('u1', 20)).resolves.toBe(20);
  });

  it('tavana yaklasirken puani kirpar', async () => {
    const { service } = buildService({ pointsToday: DAILY_QUOTAS.points - 5 });

    await expect(service.capDailyPoints('u1', 20)).resolves.toBe(5);
  });

  it('tavan dolduysa puan vermez', async () => {
    const { service } = buildService({ pointsToday: DAILY_QUOTAS.points });

    await expect(service.capDailyPoints('u1', 20)).resolves.toBe(0);
  });

  it('sifir veya negatif istek icin puan vermez', async () => {
    const { service } = buildService({ pointsToday: 0 });

    await expect(service.capDailyPoints('u1', 0)).resolves.toBe(0);
    await expect(service.capDailyPoints('u1', -5)).resolves.toBe(0);
  });

  it('kullanim ozeti tum limitleri dondurur', async () => {
    const { service } = buildService({
      topics: 1,
      evidences: 2,
      comments: 3,
      pointsToday: 40,
    });
    const usage = await service.usage('u1');

    expect(usage.topics).toEqual({ used: 1, limit: DAILY_QUOTAS.topics });
    expect(usage.evidences).toEqual({ used: 2, limit: DAILY_QUOTAS.evidences });
    expect(usage.comments).toEqual({ used: 3, limit: DAILY_QUOTAS.comments });
    expect(usage.points).toEqual({ used: 40, limit: DAILY_QUOTAS.points });
  });

  it('gun basi UTC gece yarisina gore hesaplanir', async () => {
    const { service, prisma } = buildService({ topics: 0 });
    await service.assertWithinQuota('u1', 'topics');

    const since: Date = prisma.topic.count.mock.calls[0][0].where.createdAt.gte;
    expect(since.getUTCHours()).toBe(0);
    expect(since.getUTCMinutes()).toBe(0);
  });
});
