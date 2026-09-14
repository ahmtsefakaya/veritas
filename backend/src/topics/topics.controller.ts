import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { ModerateTopicDto } from './dto/moderate-topic.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('topics')
export class TopicsController {
  constructor(private topicsService: TopicsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateTopicDto) {
    return this.topicsService.create(user.id, dto);
  }

  @Get()
  findApproved() {
    return this.topicsService.findApproved();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @Get('pending')
  findPending() {
    return this.topicsService.findPending();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.topicsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @Patch(':id/moderate')
  moderate(@Param('id') id: string, @Body() dto: ModerateTopicDto) {
    return this.topicsService.moderate(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sides/:sideId/evidences')
  addEvidence(
    @Param('sideId') sideId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateEvidenceDto,
  ) {
    return this.topicsService.addEvidence(sideId, user.id, dto);
  }
}
