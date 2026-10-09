import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OutboundMail {
  to: string;
  subject: string;
  text: string;
}

/**
 * E-posta gonderimi icin tek cikis noktasi.
 *
 * Bir SMTP/saglayici entegrasyonu yapilana kadar mesajlar yalnizca loglanir;
 * boylece dogrulama ve sifre sifirlama akislari saglayici secimine bagli
 * kalmadan uctan uca calisir. Gercek gonderim eklendiginde sadece `deliver`
 * degisir, cagiran servisler ayni kalir.
 *
 * Uretim disinda son mesajlar bellekte tutulur: testler jetonu veritabanindan
 * okuyamaz (yalnizca ozeti saklanir), bu yuzden gonderilen metni okur.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly isProduction: boolean;
  private readonly outbox: OutboundMail[] = [];

  constructor(private config: ConfigService) {
    this.isProduction = this.config.get<string>('NODE_ENV') === 'production';
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

    this.logger.log(`[mail] -> ${mail.to} | ${mail.subject}`);
  }

  /** Yalnizca test/gelistirme icin: gonderilen son mesajlar. */
  sentTo(email: string): OutboundMail[] {
    return this.outbox.filter((m) => m.to === email);
  }

  clearOutbox(): void {
    this.outbox.length = 0;
  }
}
