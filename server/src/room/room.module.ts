import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomGateway } from './room.gateway';
import { PrismaService } from 'prisma/prisma.service';
import { ChatService } from './chat.service';

@Module({
  providers: [RoomGateway, RoomService, PrismaService, ChatService],
})
export class RoomModule {}
