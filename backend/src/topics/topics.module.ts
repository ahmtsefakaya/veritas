import { Module } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { TopicsController } from './topics.controller';
import { EvidenceScoringModule } from '../evidence-scoring/evidence-scoring.module';
import { UsersModule } from '../users/users.module';
import { TopicsGateway } from './topics.gateway';

@Module({
  imports: [EvidenceScoringModule, UsersModule],
  controllers: [TopicsController],
  providers: [TopicsService, TopicsGateway],
  exports: [TopicsService],
})
export class TopicsModule {}
