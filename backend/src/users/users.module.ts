import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersService } from './users.service';
import { ReputationService } from './reputation.service';
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, PassportModule],
  controllers: [UsersController],
  providers: [UsersService, ReputationService],
  exports: [UsersService, ReputationService],
})
export class UsersModule {}
