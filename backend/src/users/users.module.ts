import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersService } from './users.service';
import { ReputationService } from './reputation.service';
import { PointsService } from './points.service';
import { PayoutEligibilityService } from './payout-eligibility.service';
import { AdminUsersService } from './admin-users.service';
import { UsersController } from './users.controller';
import { AdminUsersController } from './admin-users.controller';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, PassportModule, CommonModule, NotificationsModule],
  controllers: [UsersController, AdminUsersController],
  providers: [
    UsersService,
    ReputationService,
    PointsService,
    PayoutEligibilityService,
    AdminUsersService,
  ],
  exports: [UsersService, ReputationService, PointsService, PayoutEligibilityService],
})
export class UsersModule {}
