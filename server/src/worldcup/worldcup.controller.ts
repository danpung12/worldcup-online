import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorldcupService } from './worldcup.service';
import { CreateGameDto, CreateItemDto } from './dto/create-game.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/auth/decorator/user.decorator';

@Controller('worldcup')
export class WorldcupController {
  constructor(private readonly worldcupService: WorldcupService) {}

  // 월드컵 목록 조회
  @Get()
  getGames() {
    return this.worldcupService.getGames();
  }

  @Get('mygame')
  @UseGuards(AuthGuard('jwt'))
  getMyGames(@GetUser('id') userId: number) {
    return this.worldcupService.getGamesByCreator(userId);
  }

  // 월드컵 상세 조회
  @Get(':gameId')
  getGameById(@Param('gameId', ParseIntPipe) gameId: number) {
    return this.worldcupService.getGameById(gameId);
  }

  // 월드컵 생성
  @UseGuards(AuthGuard('jwt'))
  @Post()
  createGame(
    @Body('game') dto: CreateGameDto,
    @Body('items') items: CreateItemDto[],
    @GetUser('id') userId: number,
  ) {
    return this.worldcupService.createGame(dto, items, userId);
  }

  // 월드컵 수정
  @UseGuards(AuthGuard('jwt'))
  @Patch(':gameId')
  updateGame(
    @Body('game') dto: CreateGameDto,
    @Param('gameId', ParseIntPipe) gameId: number,
    @GetUser('id') userId: number,
  ) {
    return this.worldcupService.updateGame(dto, gameId, userId);
  }

  // 월드컵 삭제
  @UseGuards(AuthGuard('jwt'))
  @Delete(':gameId')
  deleteGame(
    @Param('gameId', ParseIntPipe) gameId: number,
    @GetUser('id') userId: number,
  ) {
    return this.worldcupService.deleteGame(gameId, userId);
  }

  // 월드컵 후보 추가
  @UseGuards(AuthGuard('jwt'))
  @Post(':gameId/items')
  createItem(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() dto: CreateItemDto,
    @GetUser('id') userId: number,
  ) {
    return this.worldcupService.createItem(gameId, dto, userId);
  }

  // 월드컵 후보 삭제
  @UseGuards(AuthGuard('jwt'))
  @Delete('items/:itemId')
  deleteItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @GetUser('id') userId: number,
  ) {
    return this.worldcupService.deleteItem(itemId, userId);
  }
}
