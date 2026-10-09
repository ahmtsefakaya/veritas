import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

const { sendMail, close, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn();
  const close = vi.fn();
  return {
    sendMail,
    close,
    createTransport: vi.fn(() => ({ sendMail, close })),
  };
});

vi.mock('nodemailer', () => ({
  createTransport: (...args: unknown[]) => createTransport(...(args as [])),
}));

function buildService(env: Record<string, string | undefined>) {
  const config = {
    get: (key: string) => env[key],
  } as unknown as ConfigService;
  return new MailService(config);
}

describe('MailService', () => {
  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue({ messageId: 'x' });
    close.mockReset();
    createTransport.mockClear();
  });

  it('SMTP_HOST yoksa transport kurmaz, yalnizca loglar', async () => {
    const service = buildService({});
    await service.send({ to: 'a@b.com', subject: 'Konu', text: 'Govde' });

    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
    // Uretim disinda govde testler icin saklanir.
    expect(service.sentTo('a@b.com')).toHaveLength(1);
  });

  it('SMTP_HOST varsa gercek gonderim yapar ve HTML govde uretir', async () => {
    const service = buildService({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'u',
      SMTP_PASSWORD: 'p',
      MAIL_FROM: 'Veritas <no-reply@veritas.app>',
    });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'u', pass: 'p' },
      }),
    );

    await service.send({
      to: 'a@b.com',
      subject: 'Dogrulama',
      text: 'Link: https://veritas.app/verify-email?token=abc',
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const payload = sendMail.mock.calls[0][0];
    expect(payload.from).toBe('Veritas <no-reply@veritas.app>');
    expect(payload.to).toBe('a@b.com');
    expect(payload.text).toContain('https://veritas.app/verify-email?token=abc');
    expect(payload.html).toContain(
      '<a href="https://veritas.app/verify-email?token=abc">',
    );
  });

  it('465 portunda implicit TLS kullanir', () => {
    buildService({ SMTP_HOST: 'smtp.example.com', SMTP_PORT: '465' });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 465, secure: true }),
    );
  });

  it('kimlik bilgisi yoksa auth gondermez', () => {
    buildService({ SMTP_HOST: 'smtp.example.com' });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587, auth: undefined }),
    );
  });

  it('gonderim hatasi cagiran islemi bozmaz', async () => {
    sendMail.mockRejectedValueOnce(new Error('smtp down'));
    const service = buildService({ SMTP_HOST: 'smtp.example.com' });

    await expect(
      service.send({ to: 'a@b.com', subject: 'K', text: 'G' }),
    ).resolves.toBeUndefined();
  });

  it('HTML govdesinde kullanici metnini kacirir', async () => {
    const service = buildService({ SMTP_HOST: 'smtp.example.com' });
    await service.send({
      to: 'a@b.com',
      subject: 'K',
      text: '<script>alert(1)</script>',
    });

    const payload = sendMail.mock.calls[0][0];
    expect(payload.html).not.toContain('<script>');
    expect(payload.html).toContain('&lt;script&gt;');
  });

  it('modul kapanirken transport kapatilir', () => {
    const service = buildService({ SMTP_HOST: 'smtp.example.com' });
    service.onModuleDestroy();

    expect(close).toHaveBeenCalledTimes(1);
  });
});
