import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { MailService } from './../src/common/mail.service.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

/**
 * E-posta dogrulama ve sifre sifirlama akislarinin uctan uca testi.
 * Jetonun duz hali veritabaninda tutulmadigi icin gonderilen e-postanin
 * govdesinden okunur (MailService uretim disinda son mesajlari saklar).
 */
describe('Hesap kurtarma akislari (e2e)', () => {
  let app: INestApplication<App>;
  let mail: MailService;
  let prisma: PrismaService;

  const suffix = Date.now().toString(36);
  const email = `qa.recovery.${suffix}@example.com`;
  const username = `qa_rec_${suffix}`.slice(0, 20);
  const password = 'QaGecici1Sifre';
  const newPassword = 'QaYeni2Sifre';

  function tokenFromMail(subjectPart: string): string {
    const messages = mail.sentTo(email).filter((m) => m.subject.includes(subjectPart));
    const last = messages[messages.length - 1];
    expect(last, `beklenen e-posta gonderilmedi: ${subjectPart}`).toBeTruthy();
    const token = last.text.match(/token=([0-9a-f]{64})/)?.[1];
    expect(token).toBeTruthy();
    return token as string;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    mail = app.get(MailService);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } }).catch(() => undefined);
    await app?.close();
  });

  it('yeni hesap dogrulanmamis baslar', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, username, password })
      .expect(201);

    expect(res.body.user.email).toBe(email);
    const row = await prisma.user.findUnique({ where: { email } });
    expect(row?.isEmailVerified).toBe(false);
  });

  it('dogrulama baglantisi ile e-posta dogrulanir ve jeton tekrar kullanilamaz', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const accessToken = login.body.tokens.accessToken;

    await request(app.getHttpServer())
      .post('/auth/email/verify/request')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(202);

    const token = tokenFromMail('dogrulayin');

    await request(app.getHttpServer())
      .post('/auth/email/verify')
      .send({ token })
      .expect(200)
      .expect((res) => expect(res.body.isEmailVerified).toBe(true));

    const row = await prisma.user.findUnique({ where: { email } });
    expect(row?.isEmailVerified).toBe(true);

    // Tek kullanimlik: ayni jeton ikinci kez calismaz.
    await request(app.getHttpServer())
      .post('/auth/email/verify')
      .send({ token })
      .expect(400);

    // Dogrulanmis hesap yeniden talep edemez.
    await request(app.getHttpServer())
      .post('/auth/email/verify/request')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(409);
  });

  it('gecersiz jeton reddedilir', async () => {
    await request(app.getHttpServer())
      .post('/auth/email/verify')
      .send({ token: 'f'.repeat(64) })
      .expect(400);

    await request(app.getHttpServer())
      .post('/auth/email/verify')
      .send({ token: 'kisa' })
      .expect(400);
  });

  it('sifre sifirlama akisi yeni sifreyle girise izin verir, eskisini kapatir', async () => {
    await request(app.getHttpServer())
      .post('/auth/password/forgot')
      .send({ email })
      .expect(202);

    const token = tokenFromMail('sifre sifirlama');

    await request(app.getHttpServer())
      .post('/auth/password/reset')
      .send({ token, password: newPassword })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: newPassword })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(401);

    // Jeton tuketildi.
    await request(app.getHttpServer())
      .post('/auth/password/reset')
      .send({ token, password: 'UcuncuSifre3' })
      .expect(400);
  });

  it('bilinmeyen e-posta icin de ayni 202 cevabi doner', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/password/forgot')
      .send({ email: `yok.${suffix}@example.com` })
      .expect(202);

    expect(res.body.ok).toBe(true);
  });

  it('zayif sifre ile sifirlama reddedilir', async () => {
    await request(app.getHttpServer())
      .post('/auth/password/reset')
      .send({ token: 'a'.repeat(64), password: 'kisa' })
      .expect(400);
  });
});
