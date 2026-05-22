import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { WorldcupService } from './worldcup.service';
import { CreateGameDto, CreateItemDto } from './dto/create-game.dto';

@Controller('worldcup')
export class WorldcupController {
  constructor(private readonly worldcupService: WorldcupService) {}

  // 월드컵 목록 조회
  @Get()
  getGames() {
    return this.worldcupService.getGames();
  }

  // 월드컵 상세 조회
  @Get(':gameId')
  getGameById(@Param('gameId', ParseIntPipe) gameId: number) {
    return this.worldcupService.getGameById(gameId);
  }

  // 월드컵 생성
  @Post()
  createGame(
    @Body('game') dto: CreateGameDto,
    @Body('items') items: CreateItemDto[],
  ) {
    const userId = 1;
    return this.worldcupService.createGame(dto, items, userId);
  }

  // 월드컵 수정
  @Patch(':gameId')
  updateGame(
    @Body('game') dto: CreateGameDto,
    @Param('gameId', ParseIntPipe) gameId: number,
  ) {
    return this.worldcupService.updateGame(dto, gameId);
  }

  // 월드컵 삭제
  @Delete(':gameId')
  deleteGame(@Param('gameId', ParseIntPipe) gameId: number) {
    return this.worldcupService.deleteGame(gameId);
  }

  // 월드컵 후보 추가
  @Post(':gameId/items')
  createItem(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() dto: CreateItemDto,
  ) {
    return this.worldcupService.createItem(gameId, dto);
  }

  // 월드컵 후보 삭제
  @Delete('items/:itemId')
  deleteItem(@Param('itemId', ParseIntPipe) itemId: number) {
    return this.worldcupService.deleteItem(itemId);
  }
}
