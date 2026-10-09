import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

export interface OutboundMail {
  to: string;
  subject: string;
  text: string;
}

/**
 * E-posta gonderimi icin tek cikis noktasi.
 *
 * SMTP_HOST tanimliysa gercek SMTP uzerinden gonderim yapilir; tanimli
 * degilse mesaj yalnizca loglanir, boylece dogrulama ve sifre sifirlama
 * akislari saglayici secimine bagli kalmadan uctan uca calisir.
 *
 * Uretim disinda son mesajlar bellekte tutulur: testler jetonu veritabanindan
 * okuyamaz (yalnizca ozeti saklanir), bu yuzden gonderilen metni okur.
 */
@Injectable()
export class MailService implements OnModuleDestroy {
  private readonly logger = new Logger(MailService.name);
  private readonly isProduction: boolean;
  private readonly outbox: OutboundMail[] = [];
  private readonly from: string;
  private readonly transporter: Transporter | null;

  constructor(private config: ConfigService) {
    this.isProduction = this.config.get<string>('NODE_ENV') === 'production';
    this.from =
      this.config.get<string>('MAIL_FROM') ??
      this.config.get<string>('SMTP_USER') ??
      'Veritas <no-reply@veritas.local>';
    this.transporter = this.createTransporter();
  }

  private createTransporter(): Transporter | null {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      const message =
        'SMTP_HOST tanimli degil; e-postalar yalnizca loglanacak.';
      if (this.isProduction) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
      return null;
    }

    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');
    // 465 implicit TLS kullanir; digerlerinde STARTTLS'e yukseltilir.
    const secure =
      (this.config.get<string>('SMTP_SECURE') ?? '').toLowerCase() === 'true' ||
      port === 465;

    this.logger.log(`SMTP gonderimi etkin (${host}:${port}, secure=${secure})`);

    return createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async send(mail: OutboundMail): Promise<void> {
    try {
      await this.deliver(mail);
    } catch (error) {
      // E-posta gonderimi ana islemi (kayit, sifre sifirlama talebi) bozmamali.
      this.logger.error(
        `E-posta gonderilemedi (${mail.subject}): ${(error as Error).message}`,
      );
    }
  }

  private async deliver(mail: OutboundMail): Promise<void> {
    if (!this.isProduction) {
      this.outbox.push(mail);
      if (this.outbox.length > 50) {
        this.outbox.shift();
      }
    }

    if (this.transporter) {
      await this.transporter.sendMail({
        from: this.from,
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
        html: MailService.toHtml(mail.text),
      });
      this.logger.log(`[mail] gonderildi -> ${mail.to} | ${mail.subject}`);
      return;
    }

    this.logger.log(`[mail] -> ${mail.to} | ${mail.subject}`);
  }

  /** Duz metni basit, baglantilari tiklanabilir HTML govdesine cevirir. */
  private static toHtml(text: string): string {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const linked = escaped.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1">$1</a>',
    );
    return `<div style="font-family:system-ui,sans-serif;line-height:1.6">${linked.replace(
      /\n/g,
      '<br />',
    )}</div>`;
  }

  /** Yalnizca test/gelistirme icin: gonderilen son mesajlar. */
  sentTo(email: string): OutboundMail[] {
    return this.outbox.filter((m) => m.to === email);
  }

  clearOutbox(): void {
    this.outbox.length = 0;
  }

  onModuleDestroy(): void {
    this.transporter?.close();
  }
}
