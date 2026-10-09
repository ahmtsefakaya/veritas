import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { PayoutEligibilityService } from './payout-eligibility.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private payoutEligibility: PayoutEligibilityService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: { id: string }) {
    return this.usersService.findById(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/eligibility')
  getMyEligibility(@CurrentUser() user: { id: string }) {
    return this.payoutEligibility.check(user.id);
  }

  @Get('payout-rules')
  getPayoutRules() {
    return this.payoutEligibility.rules();
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() user: { id: string }, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('leaderboard')
  leaderboard() {
    return this.usersService.leaderboard();
  }

  @Get(':username')
  getPublicProfile(@Param('username') username: string) {
    return this.usersService.findByUsername(username);
  }
}
