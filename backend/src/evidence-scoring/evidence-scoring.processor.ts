import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { ScoreEvidenceJob } from './evidence-scoring.service';

@Processor('evidence-scoring')
export class EvidenceScoringProcessor extends WorkerHost {
  private readonly logger = new Logger(EvidenceScoringProcessor.name);
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
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
      'Bu delili su kriterlere gore 0-100 arasi bir sayiyla puanla:',
      '- Kaynak guvenilirligi (somut, dogrulanabilir kaynak var mi)',
      '- Mantiksal tutarlilik (iddia ile gerekce birbirini destekliyor mu)',
      '- Konuyla dogrudan alaka',
      '- Somutluk (genel/belirsiz ifadeler yerine spesifik veri/olay/istatistik icermesi)',
      '',
      'SADECE gecerli JSON dondur, baska hicbir metin ekleme. Format:',
      '{"score": <0-100 arasi tam sayi>, "reasoning": "<1-2 cumlelik kisa Turkce aciklama>"}',
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

      const score = Math.max(0, Math.min(100, Math.round(parsed.score ?? 0)));
      const reasoning = String(parsed.reasoning ?? '').slice(0, 500);

      await this.prisma.evidence.update({
        where: { id: evidenceId },
        data: { score, aiReasoning: reasoning },
      });

      this.logger.log(`Evidence ${evidenceId} puanlandi: ${score}`);
    } catch (error) {
      this.logger.error(`Evidence ${evidenceId} puanlanamadi: ${error}`);
      throw error;
    }
  }
}
