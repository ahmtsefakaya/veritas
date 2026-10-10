import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isQaEmail } from '../common/qa-accounts';

export type NotificationType =
  | 'evidence_scored'
  | 'comment_reply'
  | 'topic_comment'
  | 'topic_moderated'
  | 'topic_pending_review'
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

  /**
   * Yeni dava onay bekliyor: tum ADMIN ve MODERATOR'lere haber verilir.
   *
   * Neden gerekli: dava acildiginda PENDING durumda bekliyor ve onaylanana
   * kadar kimseye gorunmuyor. Kuyruga bakan biri olmazsa dava sonsuza kadar
   * bekler, kullanici da urunun bozuk oldugunu dusunur. Bildirim, kuyrugun
   * farkedilmesini garanti eder.
   *
   * Davayi acan kisi yonetici ise kendisine bildirim gitmez.
   *
   * QA hesaplarinin (canli yolculuk testi) actigi davalar icin hic bildirim
   * uretilmez: aksi halde her test kosusu Ahmet'in bildirim ziline bir satir
   * daha ekliyor ve gercek bir dava bildirimi bu gurultunun icinde kayboluyor.
   */
  async topicPendingReview(topicId: string, topicTitle: string, creatorId: string) {
    try {
      const creator = await this.prisma.user.findUnique({
        where: { id: creatorId },
        select: { email: true },
      });
      if (isQaEmail(creator?.email)) return;

      const staff = await this.prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'MODERATOR'] }, isBanned: false },
        select: { id: true },
      });
      await Promise.all(
        staff
          .filter((s) => s.id !== creatorId)
          .map((s) =>
            this.create({
              userId: s.id,
              type: 'topic_pending_review',
              title: 'Yeni dava onay bekliyor',
              body: topicTitle,
              link: '/admin',
            }),
          ),
      );
    } catch (err) {
      this.logger.warn(`topicPendingReview bildirimi basarisiz: ${String(err)}`);
    }
  }
}
