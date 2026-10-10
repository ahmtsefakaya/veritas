import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReputationService } from './reputation.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { excludeQaAccountsFilter } from '../common/qa-accounts';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private reputation: ReputationService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        reputationScore: true,
        pointsBalance: true,
        totalEarnings: true,
        country: true,
        isPremium: true,
        premiumUntil: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi.');
    }
    return user;
  }

  async findByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        reputationScore: true,
        pointsBalance: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi.');
    }

    const stats = await this.reputation.stats(user.id);
    return { ...user, stats };
  }

  async leaderboard(limit = 20) {
    return this.prisma.user.findMany({
      where: {
        isBanned: false,
        reputationScore: { gt: 0 },
        AND: excludeQaAccountsFilter(),
      },
      orderBy: { reputationScore: 'desc' },
      take: Math.min(limit, 50),
      select: {
        username: true,
        displayName: true,
        avatarUrl: true,
        reputationScore: true,
      },
    });
  }

  async updateProfile(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        country: true,
      },
    });
  }
}
