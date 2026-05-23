import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomGateway } from './room.gateway';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  providers: [RoomGateway, RoomService, PrismaService],
})
export class RoomModule {}
