import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * Yonetim paneli ucu. Tum yollar JWT + rol korumali.
 * Ince yetki ayrimi (ADMIN vs MODERATOR) servis icinde yapilir.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MODERATOR')
@Controller('admin')
export class AdminUsersController {
  constructor(private adminUsers: AdminUsersService) {}

  @Get('stats')
  stats() {
    return this.adminUsers.stats();
  }

  @Get('users')
  list(
    @Query('q') q?: string,
    @Query('banned') banned?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit !== undefined ? Number.parseInt(limit, 10) : undefined;
    return this.adminUsers.list({
      q: q?.trim() || undefined,
      banned: banned === undefined ? undefined : banned === 'true',
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
  }

  @Patch('users/:id')
  update(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string; role: string },
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.adminUsers.update(id, actor, dto);
  }
}
