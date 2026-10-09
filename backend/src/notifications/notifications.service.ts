import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationType =
  | 'evidence_scored'
  | 'comment_reply'
  | 'topic_comment'
  | 'topic_moderated'
  | 'account_moderated'
  | 'reward_points'
  | 'payout_eligible';

type CreateInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Bildirim olusturma asla ana islemi bozmamali: puanlama, yorum veya
   * moderasyon akisinda bir hata olursa sadece loglanir.
   */
  async create(input: CreateInput) {
    try {
      return await this.prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body,
          link: input.link ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(`Bildirim olusturulamadi (${input.type}): ${error}`);
      return null;
    }
  }

  async list(userId: string, options: { unreadOnly?: boolean; limit?: number } = {}) {
    const limit = Math.min(options.limit ?? 30, 100);
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, ...(options.unreadOnly ? { isRead: false } : {}) },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { items, unreadCount };
  }

  async markRead(userId: string, notificationId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
    return { updated: result.count };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { updated: result.count };
  }

  async evidenceScored(
    userId: string,
    evidenceId: string,
    topicId: string,
    score: number,
    pointsEarned: number,
  ) {
    return this.create({
      userId,
      type: 'evidence_scored',
      title: `Kanitiniz ${score}/100 puan aldi`,
      body:
        pointsEarned > 0
          ? `Bu kanittan ${pointsEarned} odul puani kazandiniz.`
          : 'Kalite puani 60 esiginin altinda kaldigi icin odul puani kazanilmadi.',
      link: `/topics/${topicId}#evidence-${evidenceId}`,
    });
  }

  async commentReply(userId: string, topicId: string, topicTitle: string) {
    return this.create({
      userId,
      type: 'comment_reply',
      title: 'Yorumunuza yanit geldi',
      body: topicTitle,
      link: `/topics/${topicId}`,
    });
  }

  async topicComment(userId: string, topicId: string, topicTitle: string) {
    return this.create({
      userId,
      type: 'topic_comment',
      title: 'Davaniza yeni yorum yapildi',
      body: topicTitle,
      link: `/topics/${topicId}`,
    });
  }

  async topicModerated(userId: string, topicId: string, topicTitle: string, approved: boolean) {
    return this.create({
      userId,
      type: 'topic_moderated',
      title: approved ? 'Davaniz onaylandi' : 'Davaniz reddedildi',
      body: topicTitle,
      link: approved ? `/topics/${topicId}` : undefined,
    });
  }

  async payoutEligible(userId: string) {
    return this.create({
      userId,
      type: 'payout_eligible',
      title: 'Odul programi sartlarini sagladiniz',
      body: 'Tum uygunluk sartlarini tamamladiniz. Detaylari odul programi sayfasindan gorebilirsiniz.',
      link: '/rewards',
    });
  }
}
