import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  async getComment(gameId: number) {
    await this.findGame(gameId);

    return this.prisma.comment.findMany({
      where: {
        game_id: gameId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findGame(gameId: number) {
    const game = await this.prisma.worldcupGame.findUnique({
      where: {
        id: gameId,
      },
    });

    if (!game) {
      throw new NotFoundException('게임을 찾을 수 없습니다.');
    }
  }

  async createComment(
    gameId: number,
    nickname: string,
    content: string,
    userId?: number,
  ) {
    await this.findGame(gameId);

    if (!nickname.trim() || !content.trim()) {
      throw new BadRequestException('닉네임과 댓글 내용을 입력해주세요.');
    }

    return this.prisma.comment.create({
      data: {
        game_id: gameId,
        nickname: nickname.trim(),
        content: content.trim(),
        user_id: userId ?? null,
      },
    });
  }

  async deleteComment(commentId: number, userId: number) {
    const result = await this.prisma.comment.deleteMany({
      where: {
        id: commentId,
        user_id: userId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('삭제할 댓글을 찾을 수 없습니다.');
    }
  }
}
