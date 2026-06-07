import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateGameDto, CreateItemDto } from './dto/create-game.dto';

@Injectable()
export class WorldcupService {
  constructor(private readonly prisma: PrismaService) {}

  private async gameOwner(gameId: number, userId: number) {
    const game = await this.prisma.worldcupGame.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException('월드컵을 찾을 수 없습니다.');
    }

    if (game.creator_id !== userId) {
      throw new ForbiddenException('월드컵을 수정할 권한이 없습니다.');
    }
  }

  async createGame(dto: CreateGameDto, items: CreateItemDto[], userId: number) {
    return this.prisma.worldcupGame.create({
      data: { ...dto, creator_id: userId, items: { create: items } },
      include: {
        items: true,
      },
    });
  }

  async deleteGame(gameId: number, userId: number) {
    await this.gameOwner(gameId, userId);

    return this.prisma.worldcupGame.delete({
      where: {
        id: gameId,
      },
    });
  }

  async updateGame(dto: CreateGameDto, gameId: number, userId: number) {
    await this.gameOwner(gameId, userId);

    return this.prisma.worldcupGame.update({
      where: {
        id: gameId,
      },
      data: dto,
    });
  }

  async getGameById(gameId: number) {
    const game = await this.prisma.worldcupGame.findUnique({
      where: { id: gameId },
      include: { items: true },
    });

    if (!game) {
      throw new NotFoundException('월드컵을 찾을 수 없습니다.');
    }
    return game;
  }

  async getGames() {
    return this.prisma.worldcupGame.findMany({
      orderBy: {
        created_at: 'desc',
      },
      include: {
        items: true,
      },
    });
  }

  async createItem(gameId: number, dto: CreateItemDto, userId: number) {
    await this.gameOwner(gameId, userId);
    return this.prisma.worldcupItem.create({
      data: { ...dto, game_id: gameId },
    });
  }

  async deleteItem(itemId: number, userId: number) {
    const item = await this.prisma.worldcupItem.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw new NotFoundException('후보를 찾을 수 없습니다.');
    }

    await this.gameOwner(item.game_id, userId);

    return this.prisma.worldcupItem.delete({
      where: {
        id: itemId,
      },
    });
  }

  async getGamesByCreator(userId: number) {
    return this.prisma.worldcupGame.findMany({
      where: {
        creator_id: userId,
      },
      orderBy: { updated_at: 'desc' },
    });
  }
}
