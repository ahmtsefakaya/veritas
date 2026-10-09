import { describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AccountRecoveryService } from './account-recovery.service';

type UserRow = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  isEmailVerified: boolean;
  isBanned: boolean;
};

function buildService(options: {
  user?: Partial<UserRow> | null;
  tokenRecord?: unknown;
  recentTokens?: number;
}) {
  const user: UserRow | null =
    options.user === null
      ? null
      : {
          id: 'u1',
          email: 'kullanici@example.com',
          username: 'kullanici',
          displayName: 'Kullanici',
          isEmailVerified: false,
          isBanned: false,
          ...options.user,
        };

  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue(user),
    },
    userToken: {
      count: vi.fn().mockResolvedValue(options.recentTokens ?? 0),
      create: vi.fn().mockResolvedValue({ id: 't1' }),
      update: vi.fn().mockResolvedValue({ id: 't1' }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      findUnique: vi.fn().mockResolvedValue(options.tokenRecord ?? null),
    },
  };

  const config = { get: vi.fn().mockReturnValue('https://app.example.com') };
  const mail = { send: vi.fn().mockResolvedValue(undefined) };

  const service = new AccountRecoveryService(
    prisma as never,
    config as never,
    mail as never,
  );

  return { service, prisma, mail };
}

function tokenRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 't1',
    userId: 'u1',
    type: 'EMAIL_VERIFY',
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    usedAt: null,
    user: { id: 'u1', email: 'kullanici@example.com' },
    ...overrides,
  };
}

const VALID_TOKEN = 'a'.repeat(64);

describe('AccountRecoveryService - e-posta dogrulama', () => {
  it('dogrulama talebinde tek kullanimlik jeton olusturur ve e-posta gonderir', async () => {
    const { service, prisma, mail } = buildService({});

    const result = await service.requestEmailVerification('u1');

    expect(result.ok).toBe(true);
    // Eski bekleyen jetonlar gecersizlenir, sonra yenisi yazilir.
    expect(prisma.userToken.updateMany).toHaveBeenCalled();
    expect(prisma.userToken.create).toHaveBeenCalledOnce();
    const created = prisma.userToken.create.mock.calls[0][0].data;
    expect(created.type).toBe('EMAIL_VERIFY');
    expect(created.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(mail.send).toHaveBeenCalledOnce();
  });

  it('duz jetonu asla veritabanina yazmaz, yalnizca SHA-256 ozetini yazar', async () => {
    const { service, prisma, mail } = buildService({});
    await service.requestEmailVerification('u1');

    const sentText: string = mail.send.mock.calls[0][0].text;
    const plain = sentText.match(/token=([0-9a-f]+)/)?.[1] as string;
    const storedHash = prisma.userToken.create.mock.calls[0][0].data.tokenHash;

    expect(plain).toHaveLength(64);
    expect(storedHash).not.toBe(plain);
    expect(storedHash).toBe(createHash('sha256').update(plain).digest('hex'));
  });

  it('zaten dogrulanmis hesapta yeni jeton uretmez', async () => {
    const { service, prisma } = buildService({ user: { isEmailVerified: true } });

    await expect(service.requestEmailVerification('u1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.userToken.create).not.toHaveBeenCalled();
  });

  it('saatlik talep siniri asilirsa 429 doner', async () => {
    const { service, prisma } = buildService({ recentTokens: 3 });

    await expect(service.requestEmailVerification('u1')).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(prisma.userToken.create).not.toHaveBeenCalled();
  });

  it('gecerli jeton e-postayi dogrular ve jetonu tuketir', async () => {
    const { service, prisma } = buildService({ tokenRecord: tokenRow() });

    const result = await service.verifyEmail(VALID_TOKEN);

    expect(result).toEqual({ ok: true, isEmailVerified: true });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { isEmailVerified: true },
    });
    expect(prisma.userToken.update.mock.calls[0][0].data.usedAt).toBeInstanceOf(Date);
  });

  it('kullanilmis jetonu reddeder', async () => {
    const { service, prisma } = buildService({
      tokenRecord: tokenRow({ usedAt: new Date() }),
    });

    await expect(service.verifyEmail(VALID_TOKEN)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('suresi dolmus jetonu reddeder', async () => {
    const { service, prisma } = buildService({
      tokenRecord: tokenRow({ expiresAt: new Date(Date.now() - 1_000) }),
    });

    await expect(service.verifyEmail(VALID_TOKEN)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('yanlis turden jetonu kabul etmez', async () => {
    const { service } = buildService({
      tokenRecord: tokenRow({ type: 'PASSWORD_RESET' }),
    });

    await expect(service.verifyEmail(VALID_TOKEN)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('AccountRecoveryService - sifre sifirlama', () => {
  it('kayitli e-posta icin jeton uretir', async () => {
    const { service, prisma, mail } = buildService({});

    await service.requestPasswordReset('kullanici@example.com');

    expect(prisma.userToken.create.mock.calls[0][0].data.type).toBe('PASSWORD_RESET');
    expect(mail.send).toHaveBeenCalledOnce();
  });

  it('kayitli olmayan e-posta icin ayni cevabi verir ve e-posta gondermez', async () => {
    const known = buildService({});
    const unknown = buildService({ user: null });

    const a = await known.service.requestPasswordReset('kullanici@example.com');
    const b = await unknown.service.requestPasswordReset('yok@example.com');

    // Hesap varligi sizdirilmamali: mesajlar birebir ayni.
    expect(b).toEqual(a);
    expect(unknown.mail.send).not.toHaveBeenCalled();
    expect(unknown.prisma.userToken.create).not.toHaveBeenCalled();
  });

  it('kisitlanmis hesap icin jeton uretmez ama ayni cevabi verir', async () => {
    const { service, prisma, mail } = buildService({ user: { isBanned: true } });

    const result = await service.requestPasswordReset('kullanici@example.com');

    expect(result.ok).toBe(true);
    expect(prisma.userToken.create).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('sinir asiminda da ayni cevabi verir', async () => {
    const { service, prisma } = buildService({ recentTokens: 5 });

    const result = await service.requestPasswordReset('kullanici@example.com');

    expect(result.ok).toBe(true);
    expect(prisma.userToken.create).not.toHaveBeenCalled();
  });

  it('sifirlama sifreyi hash olarak yazar ve tum oturumlari dusurur', async () => {
    const { service, prisma } = buildService({
      tokenRecord: tokenRow({ type: 'PASSWORD_RESET' }),
    });

    await service.resetPassword(VALID_TOKEN, 'YeniSifre1');

    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data.passwordHash).not.toBe('YeniSifre1');
    expect(data.passwordHash.startsWith('$2')).toBe(true);
    // Sifre degisince eski refresh token gecersiz olmali.
    expect(data.refreshTokenHash).toBeNull();
  });

  it('e-posta dogrulama jetonu ile sifre sifirlanamaz', async () => {
    const { service, prisma } = buildService({
      tokenRecord: tokenRow({ type: 'EMAIL_VERIFY' }),
    });

    await expect(service.resetPassword(VALID_TOKEN, 'YeniSifre1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('sifirlama kalite veya odul puanina dokunmaz', async () => {
    const { service, prisma } = buildService({
      tokenRecord: tokenRow({ type: 'PASSWORD_RESET' }),
    });

    await service.resetPassword(VALID_TOKEN, 'YeniSifre1');

    const data = prisma.user.update.mock.calls[0][0].data;
    expect(Object.keys(data).sort()).toEqual(['passwordHash', 'refreshTokenHash']);
  });
});
