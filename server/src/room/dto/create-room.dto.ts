import { IsInt, IsString } from 'class-validator';

export class CreateRoomDto {
  @IsInt()
  gameId!: number;

  @IsString()
  nickname!: string;

  @IsString()
  avatar?: string;
}
