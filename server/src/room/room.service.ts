import {
  BadRequestException,
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

    const alreadyStart = await this.prisma.worldcupMatch.findFirst({
      where: { room_id: room.id },
    });

    if (alreadyStart) {
      throw new BadRequestException('이미 시작된 게임입니다.');
    }

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

  // 현재 매치에 투표 저장
  // 전원 투표 완료 시 승자 결정
  // 동점이면 투표 초기화 후 재투표
  // 승자 결정 후 다음 매치 또는 다음 라운드 반환
  async vote(roomCode: string, selectItemId: number, memberId: number) {
    const match = await this.getCurrentMatch(roomCode);

    if (selectItemId !== match.item_a_id && selectItemId !== match.item_b_id) {
      throw new BadRequestException('현재 매치의 후보에만 투표할 수 있습니다.');
    }

    try {
      await this.prisma.worldcupVote.create({
        data: {
          room_id: match.room_id,
          match_id: match.id,
          member_id: memberId,
          select_item_id: selectItemId,
        },
      });
    } catch (e) {
      throw new BadRequestException('이미 투표했습니다.');
    }

    const memberCount = await this.prisma.roomMember.count({
      where: {
        room_id: match.room_id,
      },
    });

    const voteCount = await this.prisma.worldcupVote.count({
      where: {
        match_id: match.id,
      },
    });

    if (voteCount < memberCount) {
      return {
        status: 'voting' as const,
      };
    } else {
      const result = await this.decideMatchWinner(match.id);

      if (result.status === 'tie') {
        await this.prisma.worldcupVote.deleteMany({
          where: {
            match_id: match.id,
          },
        });
        return {
          match,
          status: 'tie' as const,
        };
      }
    }

    const allMatch = await this.getRoundMatches(match.room_id, match.round_id);
    if (allMatch.every((match) => match.winner_id !== null)) {
      return this.createNextRound(roomCode, match);
    }

    return {
      status: 'nextMatch' as const,
      match: await this.getCurrentMatch(roomCode),
    };
  }

  async decideMatchWinner(matchId: number) {
    const match = await this.prisma.worldcupMatch.findUnique({
      where: {
        id: matchId,
      },
    });

    if (!match) throw new NotFoundException('매치를 찾을 수 없습니다. ');

    const AVoteCount = await this.prisma.worldcupVote.count({
      where: {
        match_id: matchId,
        select_item_id: match.item_a_id,
      },
    });

    const BVoteCount = await this.prisma.worldcupVote.count({
      where: {
        match_id: matchId,
        select_item_id: match.item_b_id,
      },
    });

    if (AVoteCount === BVoteCount) {
      return { status: 'tie' as const };
    }

    const winnerId =
      AVoteCount > BVoteCount ? match.item_a_id : match.item_b_id;

    await this.prisma.worldcupMatch.update({
      where: {
        id: match.id,
      },
      data: {
        winner_id: winnerId,
      },
    });

    return {
      status: 'winner' as const,
      winnerId,
    };
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

    return member;
  }
}
