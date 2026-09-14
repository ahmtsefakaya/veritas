import { Module } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { TopicsController } from './topics.controller';
import { EvidenceScoringModule } from '../evidence-scoring/evidence-scoring.module';

@Module({
  imports: [EvidenceScoringModule],
  controllers: [TopicsController],
  providers: [TopicsService],
  exports: [TopicsService],
})
export class TopicsModule {}
