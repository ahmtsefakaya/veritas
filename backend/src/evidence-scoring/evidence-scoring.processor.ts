import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { ReputationService } from '../users/reputation.service';
import { PointsService } from '../users/points.service';
import { ScoreEvidenceJob } from './evidence-scoring.service';

@Processor('evidence-scoring')
export class EvidenceScoringProcessor extends WorkerHost {
  private readonly logger = new Logger(EvidenceScoringProcessor.name);
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private reputation: ReputationService,
    private points: PointsService,
  ) {
    super();
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async process(job: Job<ScoreEvidenceJob>): Promise<void> {
    const { evidenceId } = job.data;

    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: {
        side: {
          include: { topic: true },
        },
      },
    });

    if (!evidence) {
      this.logger.warn(`Evidence ${evidenceId} bulunamadi, atlanildi.`);
      return;
    }

    const prompt = [
      `Konu: ${evidence.side.topic.title}`,
      `Konu aciklamasi: ${evidence.side.topic.description}`,
      `Bu delil hangi tarafa ait: ${evidence.side.label}`,
      `Delil icerigi: ${evidence.content}`,
      evidence.sourceUrl ? `Kaynak link: ${evidence.sourceUrl}` : 'Kaynak link verilmemis.',
      '',
      'Bu kaniti bes bilesenli kalite modeliyle degerlendir. Kullanici oylarini, populerligi veya yazar itibarini puana dahil etme:',
      '- sourceReliability: kaynak guvenilirligi, maksimum 35',
      '- verifiability: iddianin bagimsiz olarak dogrulanabilirligi, maksimum 25',
      '- relevance: konuya dogrudan alaka, maksimum 20',
      '- specificity: somut veri ve mantiksal aciklama, maksimum 15',
      '- timeliness: guncellik ve baglam, maksimum 5',
      'Her degeri 0 ile kendi maksimumu arasinda tam sayi ver. score bu bes degerin toplami olmali.',
      '',
      'SADECE gecerli JSON dondur:',
      '{"sourceReliability":0,"verifiability":0,"relevance":0,"specificity":0,"timeliness":0,"reasoning":"<kisa Turkce aciklama>"}',
    ].join('\n');

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      const cap = (value: unknown, maximum: number) =>
        Math.max(0, Math.min(maximum, Math.round(Number(value) || 0)));
      const qualityBreakdown = {
        sourceReliability: cap(parsed.sourceReliability, 35),
        verifiability: cap(parsed.verifiability, 25),
        relevance: cap(parsed.relevance, 20),
        specificity: cap(parsed.specificity, 15),
        timeliness: cap(parsed.timeliness, 5),
      };
      const score = Object.values(qualityBreakdown).reduce((sum, value) => sum + value, 0);
      const reasoning = String(parsed.reasoning ?? '').slice(0, 500);

      await this.prisma.evidence.update({
        where: { id: evidenceId },
        data: { score, aiReasoning: reasoning, qualityBreakdown },
      });

      this.logger.log(`Evidence ${evidenceId} puanlandi: ${score}`);
      await this.reputation.recalculateForEvidence(evidenceId);
      await this.points.setEvidenceScore(evidence.authorId, evidenceId, score);
    } catch (error) {
      this.logger.error(`Evidence ${evidenceId} puanlanamadi: ${error}`);
      throw error;
    }
  }
}
