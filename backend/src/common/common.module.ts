import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QuotaService } from './quota.service';
import { MailService } from './mail.service';

@Module({
  imports: [ConfigModule],
  providers: [QuotaService, MailService],
  exports: [QuotaService, MailService],
})
export class CommonModule {}
