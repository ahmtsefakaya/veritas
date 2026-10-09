import { describe, expect, it, vi } from 'vitest';
import { AdminUsersService } from './admin-users.service';

type TargetUser = {
  id: string;
  role: string;
  isBanned: boolean;
  username: string;
} | null;

function buildService(target: TargetUser, adminCount = 2) {
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue(target),
      count: vi.fn().mockResolvedValue(adminCount),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: target?.id ?? 'u2',
          username: target?.username ?? 'hedef',
          role: data.role ?? target?.role ?? 'USER',
          isBanned: data.isBanned ?? target?.isBanned ?? false,
          isPremium: data.isPremium ?? false,
        }),
      ),
    },
    topic: { count: vi.fn().mockResolvedValue(3) },
    evidence: {
      count: vi.fn().mockResolvedValue(10),
      aggregate: vi.fn().mockResolvedValue({ _count: { _all: 6 }, _avg: { score: 74.4 } }),
    },
    evidenceReport: { count: vi.fn().mockResolvedValue(2) },
    pointTransaction: { aggregate: vi.fn().mockResolvedValue({ _sum: { delta: 36 } }) },
  };
  const notifications = { create: vi.fn().mockResolvedValue(null) };
  const service = new AdminUsersService(prisma as never, notifications as never);
  return { service, prisma, notifications };
}

const normalTarget = { id: 'u2', role: 'USER', isBanned: false, username: 'hedef' };
const admin = { id: 'a1', role: 'ADMIN' };
const moderator = { id: 'm1', role: 'MODERATOR' };

describe('AdminUsersService', () => {
  it('yonetici kullaniciyi banlar ve bildirim gonderir', async () => {
    const { service, notifications } = buildService(normalTarget);
    const result = await service.update('u2', admin, { isBanned: true, note: 'spam' });

    expect(result.isBanned).toBe(true);
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u2', type: 'account_moderated', body: 'spam' }),
    );
  });

  it('ban durumu degismediyse bildirim gondermez', async () => {
    const { service, notifications } = buildService({ ...normalTarget, isBanned: true });
    await service.update('u2', admin, { isBanned: true });
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('normal kullanici moderasyon yapamaz', async () => {
    const { service } = buildService(normalTarget);
    await expect(service.update('u2', { id: 'u9', role: 'USER' }, { isBanned: true })).rejects.toThrow(
      /moderator yetkisi/,
    );
  });

  it('moderator rol veya abonelik degistiremez', async () => {
    const { service } = buildService(normalTarget);
    await expect(service.update('u2', moderator, { role: 'ADMIN' })).rejects.toThrow(
      /yonetici yetkisi/,
    );
    await expect(service.update('u2', moderator, { isPremium: true })).rejects.toThrow(
      /yonetici yetkisi/,
    );
  });

  it('moderator yetkili hesaba mudahale edemez', async () => {
    const { service } = buildService({ ...normalTarget, role: 'MODERATOR' });
    await expect(service.update('u2', moderator, { isBanned: true })).rejects.toThrow(
      /Yetkili hesaplarda/,
    );
  });

  it('moderator normal kullaniciyi banlayabilir', async () => {
    const { service } = buildService(normalTarget);
    const result = await service.update('u2', moderator, { isBanned: true });
    expect(result.isBanned).toBe(true);
  });

  it('kendi hesabini banlamayi ve kendi rolunu degistirmeyi engeller', async () => {
    const { service } = buildService({ ...normalTarget, id: 'a1', role: 'ADMIN' });
    await expect(service.update('a1', admin, { isBanned: true })).rejects.toThrow(/Kendi hesabiniz/);
    await expect(service.update('a1', admin, { role: 'USER' })).rejects.toThrow(/Kendi hesabiniz/);
  });

  it('son yoneticinin rolu dusurulemez', async () => {
    const { service } = buildService({ id: 'a2', role: 'ADMIN', isBanned: false, username: 'a2' }, 1);
    await expect(service.update('a2', admin, { role: 'USER' })).rejects.toThrow(/en az bir yonetici/);
  });

  it('olmayan kullanici icin 404 verir', async () => {
    const { service } = buildService(null);
    await expect(service.update('yok', admin, { isBanned: true })).rejects.toThrow(
      /Kullanici bulunamadi/,
    );
  });

  it('bos govde reddedilir', async () => {
    const { service } = buildService(normalTarget);
    await expect(service.update('u2', admin, {})).rejects.toThrow(/Guncellenecek bir alan/);
  });

  it('liste limiti 100 ile sinirlidir', async () => {
    const { service, prisma } = buildService(normalTarget);
    await service.list({ limit: 5000, q: 'ali' });
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
  });

  it('istatistikler ortalama kaliteyi yuvarlar ve acik bildirimleri sayar', async () => {
    const { service } = buildService(normalTarget);
    const stats = await service.stats();

    expect(stats.averageQuality).toBe(74);
    expect(stats.scoredEvidences).toBe(6);
    expect(stats.openReports).toBe(2);
    expect(stats.pointsGranted).toBe(36);
  });
});
