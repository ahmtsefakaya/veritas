import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersService } from './users.service';
import { ReputationService } from './reputation.service';
import { PointsService } from './points.service';
import { PayoutEligibilityService } from './payout-eligibility.service';
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [AuthModule, PassportModule, CommonModule],
  controllers: [UsersController],
  providers: [UsersService, ReputationService, PointsService, PayoutEligibilityService],
  exports: [UsersService, ReputationService, PointsService, PayoutEligibilityService],
})
export class UsersModule {}
