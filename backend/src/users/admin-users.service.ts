import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

/**
 * Yonetici kullanici islemleri.
 *
 * Guvenlik kurallari:
 * - Rol ve abonelik atamasi yalnizca ADMIN yapabilir; MODERATOR sadece ban/unban yapabilir.
 * - MODERATOR bir ADMIN veya baska bir MODERATOR hesabina mudahale edemez.
 * - Kimse kendi hesabini banlayamaz veya kendi rolunu degistiremez (kilitlenme riski).
 * - Son ADMIN'in rolu dusurulemez; sistem yonetici kalmadan birakilmaz.
 *
 * Bu servis kanit kalite puanina veya odul puanina dokunmaz: moderasyon yalnizca
 * erisim ve rol yonetir, kalite puanini yalnizca AI degerlendirmesi degistirir.
 */
@Injectable()
export class AdminUsersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async list(options: { q?: string; banned?: boolean; limit?: number } = {}) {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
    return this.prisma.user.findMany({
      where: {
        ...(options.banned !== undefined ? { isBanned: options.banned } : {}),
        ...(options.q
          ? {
              OR: [
                { username: { contains: options.q, mode: 'insensitive' as const } },
                { email: { contains: options.q, mode: 'insensitive' as const } },
                { displayName: { contains: options.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        role: true,
        isBanned: true,
        isPremium: true,
        isEmailVerified: true,
        reputationScore: true,
        pointsBalance: true,
        country: true,
        createdAt: true,
        _count: { select: { evidences: true, topics: true, comments: true } },
      },
    });
  }

  async update(
    targetId: string,
    actor: { id: string; role: string },
    dto: AdminUpdateUserDto,
  ) {
    if (dto.isBanned === undefined && dto.role === undefined && dto.isPremium === undefined) {
      throw new BadRequestException('Guncellenecek bir alan belirtilmedi.');
    }

    const isAdmin = actor.role === 'ADMIN';
    const isModerator = isAdmin || actor.role === 'MODERATOR';

    if (!isModerator) {
      throw new ForbiddenException('Bu islem icin moderator yetkisi gerekir.');
    }
    if ((dto.role !== undefined || dto.isPremium !== undefined) && !isAdmin) {
      throw new ForbiddenException('Rol ve abonelik degisikligi icin yonetici yetkisi gerekir.');
    }
    if (targetId === actor.id && (dto.isBanned === true || dto.role !== undefined)) {
      throw new BadRequestException('Kendi hesabinizin rolunu veya ban durumunu degistiremezsiniz.');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: true, isBanned: true, username: true },
    });
    if (!target) {
      throw new NotFoundException('Kullanici bulunamadi.');
    }

    // Moderator, yetkili personel hesaplarina mudahale edemez.
    if (!isAdmin && (target.role === 'ADMIN' || target.role === 'MODERATOR')) {
      throw new ForbiddenException('Yetkili hesaplarda islem icin yonetici yetkisi gerekir.');
    }

    // Sistemin yoneticisiz kalmasini engelle.
    if (target.role === 'ADMIN' && dto.role !== undefined && dto.role !== 'ADMIN') {
      const adminCount = await this.prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        throw new BadRequestException('Sistemde en az bir yonetici kalmali.');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: {
        ...(dto.isBanned !== undefined ? { isBanned: dto.isBanned } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.isPremium !== undefined ? { isPremium: dto.isPremium } : {}),
      },
      select: {
        id: true,
        username: true,
        role: true,
        isBanned: true,
        isPremium: true,
      },
    });

    if (dto.isBanned !== undefined && dto.isBanned !== target.isBanned) {
      await this.notifications.create({
        userId: targetId,
        type: 'account_moderated',
        title: dto.isBanned ? 'Hesabiniz kisitlandi' : 'Hesap kisitlamaniz kaldirildi',
        body: dto.note ?? (dto.isBanned ? 'Topluluk kurallari ihlali.' : 'Kisitlama kaldirildi.'),
      });
    }

    return updated;
  }

  async stats() {
    const [
      users,
      banned,
      staff,
      newUsers7d,
      topics,
      pendingTopics,
      evidences,
      scored,
      openReports,
      pointsGranted,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isBanned: true } }),
      this.prisma.user.count({ where: { role: { in: ['ADMIN', 'MODERATOR'] } } }),
      this.prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      this.prisma.topic.count(),
      this.prisma.topic.count({ where: { status: 'PENDING' } }),
      this.prisma.evidence.count(),
      this.prisma.evidence.aggregate({
        where: { score: { not: null } },
        _count: { _all: true },
        _avg: { score: true },
      }),
      this.prisma.evidenceReport.count({ where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } } }),
      this.prisma.pointTransaction.aggregate({ _sum: { delta: true } }),
    ]);

    return {
      users,
      bannedUsers: banned,
      staff,
      newUsers7d,
      topics,
      pendingTopics,
      evidences,
      scoredEvidences: scored._count._all,
      averageQuality: scored._avg.score ? Math.round(scored._avg.score) : 0,
      openReports,
      pointsGranted: pointsGranted._sum.delta ?? 0,
    };
  }
}
