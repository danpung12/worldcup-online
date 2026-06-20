import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomGateway } from './room.gateway';
import { PrismaService } from 'prisma/prisma.service';
import { ChatService } from './chat.service';
import { JwtModule } from '@nestjs/jwt';
import { OptionalJwtSocketAuthGuard } from 'src/auth/guard/optional-jwt-socket-auth.guard';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [JwtModule.register({}), RedisModule],
  providers: [
    RoomGateway,
    RoomService,
    PrismaService,
    ChatService,
    OptionalJwtSocketAuthGuard,
  ],
})
export class RoomModule {}
