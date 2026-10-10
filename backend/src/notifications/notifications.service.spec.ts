import { describe, expect, it, vi } from 'vitest';
import { NotificationsService } from './notifications.service';

function buildService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    notification: {
      create: vi.fn().mockResolvedValue({ id: 'n1' }),
      findMany: vi.fn().mockResolvedValue([{ id: 'n1' }]),
      count: vi.fn().mockResolvedValue(3),
      updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      ...(overrides.notification as object),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ email: 'gercek@ornek.com' }),
      findMany: vi.fn().mockResolvedValue([{ id: 'admin1' }, { id: 'creator' }]),
      ...(overrides.user as object),
    },
  };
  return { service: new NotificationsService(prisma as never), prisma };
}

describe('NotificationsService', () => {
  it('bildirim olusturur', async () => {
    const { service, prisma } = buildService();
    await service.create({ userId: 'u1', type: 'reward_points', title: 't', body: 'b' });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: { userId: 'u1', type: 'reward_points', title: 't', body: 'b', link: null },
    });
  });

  it('veritabani hatasi ana islemi bozmaz', async () => {
    const { service } = buildService({
      notification: { create: vi.fn().mockRejectedValue(new Error('db down')) },
    });

    await expect(
      service.create({ userId: 'u1', type: 'reward_points', title: 't', body: 'b' }),
    ).resolves.toBeNull();
  });

  it('listede okunmamis sayisini dondurur', async () => {
    const { service } = buildService();
    const result = await service.list('u1');

    expect(result.unreadCount).toBe(3);
    expect(result.items).toHaveLength(1);
  });

  it('limit 100 ile sinirlanir', async () => {
    const { service, prisma } = buildService();
    await service.list('u1', { limit: 5000 });

    expect(prisma.notification.findMany.mock.calls[0][0].take).toBe(100);
  });

  it('okunmamis filtresi uygulanir', async () => {
    const { service, prisma } = buildService();
    await service.list('u1', { unreadOnly: true });

    expect(prisma.notification.findMany.mock.calls[0][0].where).toEqual({
      userId: 'u1',
      isRead: false,
    });
  });

  it('tek bildirim sadece sahibi icin okundu isaretlenir', async () => {
    const { service, prisma } = buildService();
    const result = await service.markRead('u1', 'n9');

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'n9', userId: 'u1' },
      data: { isRead: true },
    });
    expect(result.updated).toBe(2);
  });

  it('kanit puanlandi bildiriminde kazanilan puan yazilir', async () => {
    const { service, prisma } = buildService();
    await service.evidenceScored('u1', 'e1', 't1', 88, 12);

    const data = prisma.notification.create.mock.calls[0][0].data;
    expect(data.title).toContain('88/100');
    expect(data.body).toContain('12 odul puani');
    expect(data.link).toBe('/topics/t1#evidence-e1');
  });

  it('esigin altindaki puanda odul kazanilmadigi belirtilir', async () => {
    const { service, prisma } = buildService();
    await service.evidenceScored('u1', 'e1', 't1', 42, 0);

    expect(prisma.notification.create.mock.calls[0][0].data.body).toContain('60 esiginin altinda');
  });

  it('reddedilen davada link verilmez', async () => {
    const { service, prisma } = buildService();
    await service.topicModerated('u1', 't1', 'Baslik', false);

    const data = prisma.notification.create.mock.calls[0][0].data;
    expect(data.title).toContain('reddedildi');
    expect(data.link).toBeNull();
  });

  it('gercek kullanicinin davasi yoneticilere bildirilir, kurucunun kendisine gitmez', async () => {
    const { service, prisma } = buildService();
    await service.topicPendingReview('t1', 'Baslik', 'creator');

    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    const data = prisma.notification.create.mock.calls[0][0].data;
    expect(data.userId).toBe('admin1');
    expect(data.type).toBe('topic_pending_review');
  });

  it('QA hesabinin actigi dava moderasyon bildirimi uretmez', async () => {
    const { service, prisma } = buildService({
      user: { findUnique: vi.fn().mockResolvedValue({ email: 'e2e.1@veritas-test.local' }) },
    });
    await service.topicPendingReview('t1', 'Baslik', 'qa-user');

    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
