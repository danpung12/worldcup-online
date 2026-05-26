import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  async getRoomByCode(roomCode: string) {
    const room = await this.prisma.worldcupRoom.findUnique({
      where: {
        room_code: roomCode,
      },
      include: {
        member: true,
        game: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!room) throw new NotFoundException('방을 찾을 수 없습니다.');

    return room;
  }

  async startGame(roomCode: string, memberId: number) {
    const host = await this.checkHost(roomCode, memberId);

    if (!host)
      throw new ForbiddenException('방장만 게임을 시작할 수 있습니다.');

    const room = await this.getRoomByCode(roomCode);
    const items = room.game.items.map((item) => item.id);

    await this.createMatches(room.id, 1, items);

    return this.getCurrentMatch(roomCode);
  }

  async createMatches(roomId, roundId: number, items: number[]) {
    let index = 1;

    for (let i = 0; i < items.length; i += 2) {
      await this.prisma.worldcupMatch.create({
        data: {
          room_id: roomId,
          round_id: roundId,
          match_index: index,

          item_a_id: items[i],
          item_b_id: items[i + 1],
        },
      });
      index++;
    }
  }

  async getCurrentMatch(roomCode: string) {
    const room = await this.getRoomByCode(roomCode);

    const match = await this.prisma.worldcupMatch.findFirst({
      where: {
        room_id: room.id,
        winner_id: null,
      },
      orderBy: [{ round_id: 'asc' }, { match_index: 'asc' }],
      include: {
        item_a: true,
        item_b: true,
      },
    });

    if (!match) {
      throw new NotFoundException('진행 중인 매치가 없습니다.');
    }

    return match;
  }

  async getRoundMatches(roomId: number, roundId: number) {
    return this.prisma.worldcupMatch.findMany({
      where: {
        room_id: roomId,
        round_id: roundId,
      },
      orderBy: {
        match_index: 'asc',
      },
    });
  }

  //roomCode로 방, 매치 찾기
  //winner_id 업데이트
  //다음 매치 결과 리턴
  async vote(roomCode: string, selectItemId: number) {
    const match = await this.getCurrentMatch(roomCode);

    await this.prisma.worldcupMatch.update({
      where: {
        id: match.id,
      },
      data: {
        winner_id: selectItemId,
      },
    });

    const allMatch = await this.getRoundMatches(match.room_id, match.round_id);
    if (allMatch.every((match) => match.winner_id !== null)) {
      return this.createNextRound(roomCode, match);
    }

    return this.getCurrentMatch(roomCode);
  }

  async createNextRound(roomCode, match) {
    const matches = await this.getRoundMatches(match.room_id, match.round_id);

    const winnerIds = matches.map((match) => match.winner_id!);

    if (winnerIds.length === 1) {
      return {
        winnerId: winnerIds[0],
        finished: true,
      };
    }

    const nextRoundId = match.round_id + 1;
    await this.createMatches(match.room_id, nextRoundId, winnerIds);
    return this.getCurrentMatch(roomCode);
  }

  async checkHost(roomCode: string, memberId: number) {
    const member = await this.prisma.roomMember.findFirst({
      where: {
        id: memberId,
        is_host: true,
        room: {
          room_code: roomCode,
        },
      },
    });

    // true, false로 리턴.
    return !!member;
  }

  async joinRoom(roomCode: string, nickname: string) {
    const room = await this.getRoomByCode(roomCode);

    const member = await this.prisma.roomMember.create({
      data: {
        room_id: room.id,
        nickname,
        is_host: false,
      },
    });

    return  member;
  }
}
