import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvidenceScoringService } from '../evidence-scoring/evidence-scoring.service';
import { ReportEvidenceDto } from './dto/report-evidence.dto';

/**
 * Kaynak sikayet ve yeniden degerlendirme akisi.
 *
 * Tasarim kurali (urun sahibinin kesin karari): kullanici sikayeti bir kanitin
 * kalite puanini ASLA dogrudan degistirmez. Sikayet yalnizca bir INCELEME
 * SINYALIDIR. Esik asildiginda kanit yeniden AI degerlendirmesine girer ve
 * puani yalnizca AI'in yeni analizi degistirir. Boylece art niyetli bir
 * kalabalik, kanitin puanini oy cokluguyla dusuremez.
 *
 * Esik mantigi: bir kanit icin BIRBIRINDEN FARKLI kullanicilardan gelen
 * acik sikayet sayisi esige ulasirsa yeniden puanlama kuyruga alinir.
 * Ayni kullanici ayni kanit icin yalnizca bir kez sikayet edebilir
 * (veritabani seviyesinde unique kisit).
 */
export const REVIEW_THRESHOLD = 3;

@Injectable()
export class EvidenceReportsService {
  private readonly logger = new Logger(EvidenceReportsService.name);

  constructor(
    private prisma: PrismaService,
    private scoring: EvidenceScoringService,
  ) {}

  async report(evidenceId: string, reporterId: string, dto: ReportEvidenceDto) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
      select: { id: true, authorId: true },
    });
    if (!evidence) {
      throw new NotFoundException('Kanit bulunamadi.');
    }
    if (evidence.authorId === reporterId) {
      throw new ForbiddenException('Kendi kanitinizi sikayet edemezsiniz.');
    }

    const existing = await this.prisma.evidenceReport.findUnique({
      where: { evidenceId_reporterId: { evidenceId, reporterId } },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Bu kaniti zaten sikayet ettiniz.');
    }

    await this.prisma.evidenceReport.create({
      data: { evidenceId, reporterId, reason: dto.reason, detail: dto.detail ?? null },
    });

    const pendingCount = await this.prisma.evidenceReport.count({
      where: { evidenceId, status: 'PENDING' },
    });

    // Esik asildiysa kaniti yeniden AI degerlendirmesine sok.
    let reviewQueued = false;
    if (pendingCount >= REVIEW_THRESHOLD) {
      await this.prisma.evidenceReport.updateMany({
        where: { evidenceId, status: 'PENDING' },
        data: { status: 'UNDER_REVIEW' },
      });
      await this.scoring.enqueueScoring(evidenceId);
      reviewQueued = true;
      this.logger.log(
        `Kanit ${evidenceId} ${pendingCount} sikayet sonrasi yeniden degerlendirmeye alindi.`,
      );
    }

    return {
      evidenceId,
      reportCount: pendingCount,
      reviewThreshold: REVIEW_THRESHOLD,
      reviewQueued,
    };
  }

  /** Moderator kuyrugu: incelenmesi gereken sikayetler. */
  async queue(status = 'UNDER_REVIEW', limit = 50) {
    return this.prisma.evidenceReport.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' },
      take: Math.min(limit, 100),
      include: {
        reporter: { select: { username: true, displayName: true } },
        evidence: {
          select: {
            id: true,
            content: true,
            sourceUrl: true,
            score: true,
            qualityBreakdown: true,
            author: { select: { username: true } },
            side: { select: { label: true, topic: { select: { id: true, title: true } } } },
          },
        },
      },
    });
  }

  /** Moderator karari: sikayeti kapatir. Puan degisimi AI'a aittir. */
  async resolve(
    reportId: string,
    moderator: { id: string; role: string },
    action: 'ACCEPT' | 'REJECT',
    note?: string,
  ) {
    if (moderator.role !== 'ADMIN' && moderator.role !== 'MODERATOR') {
      throw new ForbiddenException('Bu islem icin moderator yetkisi gerekir.');
    }

    const report = await this.prisma.evidenceReport.findUnique({
      where: { id: reportId },
      select: { id: true, evidenceId: true },
    });
    if (!report) {
      throw new NotFoundException('Sikayet bulunamadi.');
    }

    const updated = await this.prisma.evidenceReport.update({
      where: { id: reportId },
      data: {
        status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
        resolution: note ?? null,
        resolvedAt: new Date(),
      },
    });

    // Kabul edilen sikayette kanit bir kez daha AI degerlendirmesine girer.
    if (action === 'ACCEPT') {
      await this.scoring.enqueueScoring(report.evidenceId);
    }

    return updated;
  }

  async summaryFor(evidenceIds: string[]) {
    if (evidenceIds.length === 0) return new Map<string, number>();
    const grouped = await this.prisma.evidenceReport.groupBy({
      by: ['evidenceId'],
      where: { evidenceId: { in: evidenceIds }, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      _count: { _all: true },
    });
    return new Map(grouped.map((row) => [row.evidenceId, row._count._all]));
  }
}
