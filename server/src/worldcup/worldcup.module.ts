import { Module } from '@nestjs/common';
import { WorldcupService } from './worldcup.service';
import { WorldcupController } from './worldcup.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [WorldcupController],
  providers: [WorldcupService, PrismaService],
})
export class WorldcupModule {}
