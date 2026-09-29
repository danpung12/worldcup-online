import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import {
  CreateGameDto,
  CreateItemDto,
  UpdateItemDto,
} from './dto/create-game.dto';

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
    const game = await this.prisma.worldcupGame.create({
      data: { ...dto, creator_id: userId, items: { create: items } },
      include: {
        items: {
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    return game;
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
      include: {
        items: {
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    if (!game) {
      throw new NotFoundException('월드컵을 찾을 수 없습니다.');
    }
    return game;
  }

  async getGames() {
    const games = await this.prisma.worldcupGame.findMany({
      orderBy: {
        created_at: 'desc',
      },
      include: {
        items: {
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    return games;
  }

  async createItem(gameId: number, dto: CreateItemDto, userId: number) {
    await this.gameOwner(gameId, userId);
    return this.prisma.worldcupItem.create({
      data: { ...dto, game_id: gameId },
    });
  }

  async updateItem(itemId: number, dto: UpdateItemDto, userId: number) {
    const item = await this.prisma.worldcupItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('해당 아이템이 없습니다.');
    }

    await this.gameOwner(item.game_id, userId);

    return this.prisma.worldcupItem.update({
      where: {
        id: itemId,
      },
      data: dto,
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
    const games = await this.prisma.worldcupGame.findMany({
      where: {
        creator_id: userId,
      },
      include: {
        items: {
          orderBy: {
            id: 'asc',
          },
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    return games;
  }
}
