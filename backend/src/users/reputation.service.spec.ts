import { ReputationService } from './reputation.service';

describe('ReputationService', () => {
  function serviceWith(overrides: Record<string, any> = {}) {
    const prisma: any = {
      evidence: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { score: 0 }, _avg: { score: null }, _count: { score: 0 } }),
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      },
      evidenceVote: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { value: 0 }, _count: 0 }),
      },
      topic: { count: vi.fn().mockResolvedValue(0) },
      comment: { count: vi.fn().mockResolvedValue(0) },
      user: { update: vi.fn().mockResolvedValue({}) },
      ...overrides,
    };
    return { service: new ReputationService(prisma), prisma };
  }

  it('calculates AI score contribution plus net vote contribution', async () => {
    const { service } = serviceWith({
      evidence: {
        aggregate: vi
          .fn()
          .mockResolvedValueOnce({ _sum: { score: 75 } })
          .mockResolvedValueOnce({ _avg: { score: 75 }, _count: { score: 2 } }),
      },
      evidenceVote: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { value: 3 }, _count: 4 }),
      },
    });

    await expect(service.computeFor('user-1')).resolves.toBe(14);
  });

  it('never returns a negative reputation', async () => {
    const { service } = serviceWith({
      evidence: { aggregate: vi.fn().mockResolvedValue({ _sum: { score: 0 } }) },
      evidenceVote: { aggregate: vi.fn().mockResolvedValue({ _sum: { value: -99 } }) },
    });

    await expect(service.computeFor('user-1')).resolves.toBe(0);
  });

  it('persists recalculated reputation', async () => {
    const { service, prisma } = serviceWith({
      evidence: { aggregate: vi.fn().mockResolvedValue({ _sum: { score: 80 } }) },
      evidenceVote: { aggregate: vi.fn().mockResolvedValue({ _sum: { value: 1 } }) },
    });

    await expect(service.recalculate('user-1')).resolves.toBe(10);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { reputationScore: 10 },
    });
  });

  it('returns profile statistics and strongest approved evidence', async () => {
    const { service } = serviceWith({
      evidence: {
        count: vi.fn().mockResolvedValue(3),
        aggregate: vi.fn().mockResolvedValue({ _avg: { score: 72.4 }, _count: { score: 2 } }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'e-1', score: 90, content: 'strong', sourceUrl: null, createdAt: new Date(),
            side: { label: 'Evet', position: 'A', topic: { id: 't-1', title: 'Konu', status: 'APPROVED' } },
          },
          {
            id: 'e-2', score: 50, content: 'weak', sourceUrl: null, createdAt: new Date(),
            side: { label: 'Hayir', position: 'B', topic: { id: 't-2', title: 'Bekleyen', status: 'PENDING' } },
          },
        ]),
      },
      evidenceVote: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { value: 2 }, _count: 3 }),
      },
      topic: { count: vi.fn().mockResolvedValue(1) },
      comment: { count: vi.fn().mockResolvedValue(4) },
    });

    const stats = await service.stats('user-1');
    expect(stats).toMatchObject({
      evidenceCount: 3,
      scoredEvidenceCount: 2,
      averageScore: 72,
      netVotes: 2,
      voteCount: 3,
      topicCount: 1,
      commentCount: 4,
    });
    expect(stats.bestEvidences).toHaveLength(1);
    expect(stats.bestEvidences[0].id).toBe('e-1');
  });
});
