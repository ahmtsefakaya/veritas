import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface ScoreEvidenceJob {
  evidenceId: string;
}

@Injectable()
export class EvidenceScoringService {
  constructor(
    @InjectQueue('evidence-scoring') private scoringQueue: Queue<ScoreEvidenceJob>,
  ) {}

  async enqueueScoring(evidenceId: string) {
    await this.scoringQueue.add(
      'score-evidence',
      { evidenceId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }
}
