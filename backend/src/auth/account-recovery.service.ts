import {
  BadRequestException,
  Injectable,
  Logger,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/mail.service';

const SALT_ROUNDS = 12;
const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
/** Hesap basina saatlik jeton talebi ust siniri (e-posta bombardimanini onler). */
const MAX_REQUESTS_PER_HOUR = 3;

type TokenType = 'EMAIL_VERIFY' | 'PASSWORD_RESET';

export interface GenericAck {
  ok: true;
  message: string;
}

/**
 * E-posta dogrulama ve sifre sifirlama.
 *
 * Jetonlar 32 bayt rastgele veridir; veritabaninda yalnizca SHA-256 ozeti
 * tutulur (yuksek entropili jeton icin bcrypt gereksiz yavas). Her jeton tek
 * kullanimlidir ve ayni turden eski jetonlar yeni talepte gecersizlesir.
 *
 * Bu akislar kanit kalite puanina veya odul puanina dokunmaz; yalnizca
 * `isEmailVerified` bayragini ve sifreyi degistirir.
 */
@Injectable()
export class AccountRecoveryService {
  private readonly logger = new Logger(AccountRecoveryService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private appUrl(): string {
    return (
      this.config.get<string>('APP_URL') ??
      'https://veritas-iota-inky.vercel.app'
    ).replace(/\/+$/, '');
  }

  private async assertNotFlooding(userId: string, type: TokenType) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.prisma.userToken.count({
      where: { userId, type, createdAt: { gte: since } },
    });

    if (recent >= MAX_REQUESTS_PER_HOUR) {
      throw new HttpException(
        'Cok fazla talep gonderildi. Lutfen bir saat sonra tekrar deneyin.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async issueToken(
    userId: string,
    type: TokenType,
    ttlMs: number,
  ): Promise<string> {
    const token = randomBytes(32).toString('hex');

    // Ayni turden bekleyen jetonlari gecersiz kil: her zaman tek gecerli jeton.
    await this.prisma.userToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    });

    await this.prisma.userToken.create({
      data: {
        userId,
        type,
        tokenHash: this.hash(token),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });

    return token;
  }

  private async consumeToken(token: string, type: TokenType) {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Jeton gecersiz.');
    }

    const record = await this.prisma.userToken.findUnique({
      where: { tokenHash: this.hash(token) },
      include: { user: true },
    });

    if (!record || record.type !== type) {
      throw new BadRequestException('Jeton gecersiz.');
    }

    if (record.usedAt) {
      throw new BadRequestException('Bu baglanti daha once kullanilmis.');
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Baglantinin suresi dolmus.');
    }

    await this.prisma.userToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return record;
  }

  async requestEmailVerification(userId: string): Promise<GenericAck> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Kullanici bulunamadi.');
    }

    if (user.isEmailVerified) {
      throw new ConflictException('E-posta adresi zaten dogrulanmis.');
    }

    await this.assertNotFlooding(userId, 'EMAIL_VERIFY');
    const token = await this.issueToken(
      userId,
      'EMAIL_VERIFY',
      EMAIL_VERIFY_TTL_MS,
    );

    await this.mail.send({
      to: user.email,
      subject: 'Veritas - e-posta adresinizi dogrulayin',
      text:
        `Merhaba ${user.displayName ?? user.username},\n\n` +
        'E-posta adresinizi dogrulamak icin asagidaki baglantiyi acin:\n' +
        `${this.appUrl()}/verify-email?token=${token}\n\n` +
        'Baglanti 24 saat gecerlidir.',
    });

    return { ok: true, message: 'Dogrulama baglantisi e-posta adresinize gonderildi.' };
  }

  async verifyEmail(token: string): Promise<{ ok: true; isEmailVerified: true }> {
    const record = await this.consumeToken(token, 'EMAIL_VERIFY');

    await this.prisma.user.update({
      where: { id: record.userId },
      data: { isEmailVerified: true },
    });

    this.logger.log(`E-posta dogrulandi: ${record.userId}`);
    return { ok: true, isEmailVerified: true };
  }

  /**
   * Hesap sayimini sizdirmamak icin cevap her zaman ayni: e-posta kayitli
   * olmasa da ayni onay mesaji doner.
   */
  async requestPasswordReset(email: string): Promise<GenericAck> {
    const ack: GenericAck = {
      ok: true,
      message:
        'Eger bu e-posta kayitliysa sifre sifirlama baglantisi gonderildi.',
    };

    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || user.isBanned) {
      return ack;
    }

    try {
      await this.assertNotFlooding(user.id, 'PASSWORD_RESET');
    } catch {
      // Talep sayisini da sizdirmamak icin ayni cevabi don.
      return ack;
    }

    const token = await this.issueToken(
      user.id,
      'PASSWORD_RESET',
      PASSWORD_RESET_TTL_MS,
    );

    await this.mail.send({
      to: user.email,
      subject: 'Veritas - sifre sifirlama',
      text:
        `Merhaba ${user.displayName ?? user.username},\n\n` +
        'Sifrenizi sifirlamak icin asagidaki baglantiyi acin:\n' +
        `${this.appUrl()}/reset-password?token=${token}\n\n` +
        'Baglanti 1 saat gecerlidir. Bu talebi siz yapmadiysaniz bu mesaji yok sayin.',
    });

    return ack;
  }

  /**
   * Sifre degisince tum oturumlar dusurulur: refresh token ozeti silinir,
   * boylece calinmis bir oturum yeni sifreyle devam edemez.
   */
  async resetPassword(token: string, password: string): Promise<GenericAck> {
    const record = await this.consumeToken(token, 'PASSWORD_RESET');

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, refreshTokenHash: null },
    });

    await this.prisma.userToken.updateMany({
      where: { userId: record.userId, type: 'PASSWORD_RESET', usedAt: null },
      data: { usedAt: new Date() },
    });

    this.logger.log(`Sifre sifirlandi: ${record.userId}`);
    return { ok: true, message: 'Sifreniz guncellendi. Giris yapabilirsiniz.' };
  }
}
