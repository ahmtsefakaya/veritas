import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AccountRecoveryService } from './account-recovery.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, VerifyEmailDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private recovery: AccountRecoveryService,
  ) {}

  // Coklu hesap acma ve sifre deneme saldirilarina karsi siki limit.
  @Throttle({ short: { ttl: 60_000, limit: 5 }, long: { ttl: 3_600_000, limit: 20 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ short: { ttl: 60_000, limit: 10 }, long: { ttl: 3_600_000, limit: 50 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@CurrentUser() user: { id: string; email: string; username: string; role: string }) {
    return this.authService.refreshTokens(user.id, user.email, user.username, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentUser() user: { id: string }) {
    return this.authService.logout(user.id);
  }

  // E-posta dogrulama baglantisi talebi: hesap basina saatlik ic limit de var.
  @Throttle({ short: { ttl: 60_000, limit: 3 }, long: { ttl: 3_600_000, limit: 10 } })
  @UseGuards(JwtAuthGuard)
  @Post('email/verify/request')
  @HttpCode(HttpStatus.ACCEPTED)
  requestEmailVerification(@CurrentUser() user: { id: string }) {
    return this.recovery.requestEmailVerification(user.id);
  }

  @Throttle({ short: { ttl: 60_000, limit: 10 }, long: { ttl: 3_600_000, limit: 40 } })
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.recovery.verifyEmail(dto.token);
  }

  @Throttle({ short: { ttl: 60_000, limit: 3 }, long: { ttl: 3_600_000, limit: 10 } })
  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.recovery.requestPasswordReset(dto.email);
  }

  @Throttle({ short: { ttl: 60_000, limit: 5 }, long: { ttl: 3_600_000, limit: 20 } })
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.recovery.resetPassword(dto.token, dto.password);
  }
}
