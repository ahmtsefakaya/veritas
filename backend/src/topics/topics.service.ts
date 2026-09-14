import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvidenceScoringService } from '../evidence-scoring/evidence-scoring.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { ModerateTopicDto, ModerationAction } from './dto/moderate-topic.dto';

@Injectable()
export class TopicsService {
  constructor(
    private prisma: PrismaService,
    private evidenceScoringService: EvidenceScoringService,
  ) {}

  async create(creatorId: string, dto: CreateTopicDto) {
    return this.prisma.topic.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        creatorId,
        sides: {
          create: [
            { position: 'A', label: dto.sideALabel },
            { position: 'B', label: dto.sideBLabel },
          ],
        },
      },
      include: { sides: true },
    });
  }

  async findApproved() {
    return this.prisma.topic.findMany({
      where: { status: 'APPROVED' },
      include: { sides: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPending() {
    return this.prisma.topic.findMany({
      where: { status: 'PENDING' },
      include: { sides: true, creator: { select: { username: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: {
        sides: {
          include: {
            evidences: {
              orderBy: { score: 'desc' },
              include: { author: { select: { username: true, displayName: true } } },
            },
          },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException('Konu bulunamadi.');
    }

    return topic;
  }

  async moderate(topicId: string, dto: ModerateTopicDto) {
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      throw new NotFoundException('Konu bulunamadi.');
    }

    const statusMap = {
      [ModerationAction.APPROVE]: 'APPROVED',
      [ModerationAction.REJECT]: 'REJECTED',
      [ModerationAction.REQUEST_REVISION]: 'NEEDS_REVISION',
    } as const;

    return this.prisma.topic.update({
      where: { id: topicId },
      data: {
        status: statusMap[dto.action],
        moderationNote: dto.note ?? null,
      },
    });
  }

  async addEvidence(sideId: string, authorId: string, dto: CreateEvidenceDto) {
    const side = await this.prisma.side.findUnique({
      where: { id: sideId },
      include: { topic: true },
    });

    if (!side) {
      throw new NotFoundException('Taraf bulunamadi.');
    }

    if (side.topic.status !== 'APPROVED') {
      throw new BadRequestException('Bu konu henuz onaylanmadigi icin delil eklenemez.');
    }

    const evidence = await this.prisma.evidence.create({
      data: {
        sideId,
        authorId,
        content: dto.content,
        sourceUrl: dto.sourceUrl,
      },
    });

    await this.evidenceScoringService.enqueueScoring(evidence.id);

    return evidence;
  }
}
