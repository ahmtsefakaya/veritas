import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ListTopicsDto } from './dto/list-topics.dto';
import { ModerateTopicDto } from './dto/moderate-topic.dto';
import { VoteEvidenceDto } from './dto/vote-evidence.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
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
  findApproved(@Query() query: ListTopicsDto) {
    return this.topicsService.findApproved(query);
  }

  @Get('categories')
  listCategories() {
    return this.topicsService.listCategories();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  @Get('pending')
  findPending() {
    return this.topicsService.findPending();
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user?: { id: string }) {
    return this.topicsService.findOne(id, user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('evidences/:evidenceId/vote')
  voteEvidence(
    @Param('evidenceId') evidenceId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: VoteEvidenceDto,
  ) {
    return this.topicsService.voteEvidence(evidenceId, user.id, dto.value);
  }

  @Get(':id/comments')
  listComments(@Param('id') id: string) {
    return this.topicsService.listComments(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCommentDto,
  ) {
    return this.topicsService.addComment(id, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:commentId')
  deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.topicsService.deleteComment(commentId, user);
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
