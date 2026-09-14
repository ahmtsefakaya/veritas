import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EvidenceScoringService } from './evidence-scoring.service';
import { EvidenceScoringProcessor } from './evidence-scoring.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          url: process.env.REDIS_URL,
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'evidence-scoring',
    }),
  ],
  providers: [EvidenceScoringService, EvidenceScoringProcessor],
  exports: [EvidenceScoringService],
})
export class EvidenceScoringModule {}
