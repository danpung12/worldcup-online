import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateGameDto, CreateItemDto } from './dto/create-game.dto';

@Injectable()
export class WorldcupService {
  constructor(private readonly prisma: PrismaService) {}

  async createGame(dto: CreateGameDto, items: CreateItemDto[], userId: number) {
    return this.prisma.worldcupGame.create({
      data: { ...dto, creator_id: userId, items: { create: items } },
      include: {
        items: true,
      },
    });
  }

  async deleteGame(gameId: number) {
    await this.getGameById(gameId);

    return this.prisma.worldcupGame.delete({
      where: {
        id: gameId,
      },
    });
  }

  async updateGame(dto: CreateGameDto, gameId: number) {
    await this.getGameById(gameId);

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
        play_count: true,
      },
    });
  }

  async createItem(gameId: number, dto: CreateItemDto) {
    return this.prisma.worldcupItem.create({
      data: { ...dto, game_id: gameId },
    });
  }

  async deleteItem(itemId: number) {
    return this.prisma.worldcupItem.delete({
      where: {
        id: itemId,
      },
    });
  }
}
