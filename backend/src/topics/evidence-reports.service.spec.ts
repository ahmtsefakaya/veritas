import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EvidenceReportsService, REVIEW_THRESHOLD } from './evidence-reports.service';

function buildService(options: {
  evidence?: { id: string; authorId: string } | null;
  existingReport?: { id: string } | null;
  pendingCount?: number;
  report?: { id: string; evidenceId: string } | null;
}) {
  const prisma = {
    evidence: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          options.evidence === undefined ? { id: 'e1', authorId: 'author' } : options.evidence,
        ),
    },
    evidenceReport: {
      findUnique: vi.fn().mockResolvedValue(options.existingReport ?? null),
      create: vi.fn().mockResolvedValue({ id: 'r1' }),
      count: vi.fn().mockResolvedValue(options.pendingCount ?? 1),
      updateMany: vi.fn().mockResolvedValue({ count: options.pendingCount ?? 1 }),
      update: vi.fn().mockResolvedValue({ id: 'r1', status: 'ACCEPTED' }),
      findMany: vi.fn().mockResolvedValue([]),
      groupBy: vi.fn().mockResolvedValue([{ evidenceId: 'e1', _count: { _all: 2 } }]),
    },
  };
  const scoring = { enqueueScoring: vi.fn().mockResolvedValue(undefined) };
  return {
    service: new EvidenceReportsService(prisma as never, scoring as never),
    prisma,
    scoring,
  };
}

describe('EvidenceReportsService', () => {
  it('sikayet kaydeder ama esik altinda yeniden puanlama tetiklemez', async () => {
    const { service, scoring } = buildService({ pendingCount: REVIEW_THRESHOLD - 1 });
    const result = await service.report('e1', 'reporter', { reason: 'FAKE_SOURCE' });

    expect(result.reviewQueued).toBe(false);
    expect(scoring.enqueueScoring).not.toHaveBeenCalled();
  });

  it('esige ulasinca kaniti yeniden AI degerlendirmesine alir', async () => {
    const { service, scoring, prisma } = buildService({ pendingCount: REVIEW_THRESHOLD });
    const result = await service.report('e1', 'reporter', { reason: 'OUT_OF_CONTEXT' });

    expect(result.reviewQueued).toBe(true);
    expect(scoring.enqueueScoring).toHaveBeenCalledWith('e1');
    expect(prisma.evidenceReport.updateMany).toHaveBeenCalledWith({
      where: { evidenceId: 'e1', status: 'PENDING' },
      data: { status: 'UNDER_REVIEW' },
    });
  });

  it('kendi kanitini sikayet etmeyi engeller', async () => {
    const { service } = buildService({ evidence: { id: 'e1', authorId: 'reporter' } });

    await expect(
      service.report('e1', 'reporter', { reason: 'DUPLICATE' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ayni kullanicinin ikinci sikayetini reddeder', async () => {
    const { service } = buildService({ existingReport: { id: 'old' } });

    await expect(
      service.report('e1', 'reporter', { reason: 'DUPLICATE' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('olmayan kanit icin hata verir', async () => {
    const { service } = buildService({ evidence: null });

    await expect(
      service.report('yok', 'reporter', { reason: 'OFF_TOPIC' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('moderator olmayan kullanici sikayeti kapatamaz', async () => {
    const { service } = buildService({});

    await expect(
      service.resolve('r1', { id: 'u1', role: 'USER' }, 'ACCEPT'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('kabul edilen sikayet yeniden puanlama tetikler', async () => {
    const { service, scoring } = buildService({ report: { id: 'r1', evidenceId: 'e1' } });
    const prismaAware = service as unknown as {
      prisma: { evidenceReport: { findUnique: ReturnType<typeof vi.fn> } };
    };
    prismaAware.prisma.evidenceReport.findUnique.mockResolvedValue({
      id: 'r1',
      evidenceId: 'e1',
    });

    await service.resolve('r1', { id: 'mod', role: 'MODERATOR' }, 'ACCEPT', 'kaynak sahte');

    expect(scoring.enqueueScoring).toHaveBeenCalledWith('e1');
  });

  it('reddedilen sikayet yeniden puanlama tetiklemez', async () => {
    const { service, scoring } = buildService({});
    const prismaAware = service as unknown as {
      prisma: { evidenceReport: { findUnique: ReturnType<typeof vi.fn> } };
    };
    prismaAware.prisma.evidenceReport.findUnique.mockResolvedValue({
      id: 'r1',
      evidenceId: 'e1',
    });

    await service.resolve('r1', { id: 'mod', role: 'ADMIN' }, 'REJECT');

    expect(scoring.enqueueScoring).not.toHaveBeenCalled();
  });

  it('bos listede sorgu yapmaz', async () => {
    const { service, prisma } = buildService({});
    const result = await service.summaryFor([]);

    expect(result.size).toBe(0);
    expect(prisma.evidenceReport.groupBy).not.toHaveBeenCalled();
  });

  it('acik sikayet sayilarini kanit basina dondurur', async () => {
    const { service } = buildService({});
    const result = await service.summaryFor(['e1']);

    expect(result.get('e1')).toBe(2);
  });
});
