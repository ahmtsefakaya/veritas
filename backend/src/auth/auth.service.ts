import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 12;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  reputationScore: number;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private toPublicUser(user: any): PublicUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      reputationScore: user.reputationScore,
    };
  }

  private async issueTokens(userId: string, email: string, username: string, role: string): Promise<TokenPair> {
    const payload = { sub: userId, email, username, role };

    const accessOptions: any = {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    };

    const refreshOptions: any = {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
    };

    const accessToken = await this.jwt.signAsync(payload, accessOptions);
    const refreshToken = await this.jwt.signAsync(payload, refreshOptions);

    const refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto): Promise<{ user: PublicUser; tokens: TokenPair }> {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });

    if (existing) {
      const field = existing.email === dto.email ? 'E-posta' : 'Kullanici adi';
      throw new ConflictException(field + ' zaten kullanimda.');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        displayName: dto.displayName ?? dto.username,
        passwordHash,
      },
    });

    const tokens = await this.issueTokens(user.id, user.email, user.username, user.role);
    return { user: this.toPublicUser(user), tokens };
  }

  async login(dto: LoginDto): Promise<{ user: PublicUser; tokens: TokenPair }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('E-posta veya sifre hatali.');
    }

    if (user.isBanned) {
      throw new UnauthorizedException('Bu hesap askiya alinmis.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('E-posta veya sifre hatali.');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.username, user.role);
    return { user: this.toPublicUser(user), tokens };
  }

  async refreshTokens(userId: string, email: string, username: string, role: string): Promise<TokenPair> {
    return this.issueTokens(userId, email, username, role);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }
}
