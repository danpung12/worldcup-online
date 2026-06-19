import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { GetUser } from 'src/auth/decorator/user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from 'src/auth/guard/optional-jwt-auth.guard';

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get(':gameId')
  getComment(@Param('gameId', ParseIntPipe) gameId: number) {
    return this.commentService.getComment(gameId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  createComment(
    @Body() body: { gameId: number; nickname: string; content: string },
    @GetUser('id') userId,
  ) {
    return this.commentService.createComment(
      body.gameId,
      body.nickname,
      body.content,
      userId,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':commentId')
  deleteComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @GetUser('id') userId,
  ) {
    return this.commentService.deleteComment(commentId, userId);
  }
}
