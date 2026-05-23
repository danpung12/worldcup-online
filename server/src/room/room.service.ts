import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { v4 } from 'uuid';

@Injectable()
export class RoomService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(dto: CreateRoomDto, userId?: number) {
    return this.prisma.worldcupRoom.create({
      data: {
        game_id: dto.gameId,
        room_code: v4().slice(0, 5),
        member: {
          create: {
            nickname: dto.nickname,
            is_host: true,
            user_id: userId,
          },
        },
      },
      include: {
        member: true,
      },
    });
  }
}
