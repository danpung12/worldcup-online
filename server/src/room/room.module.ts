import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomGateway } from './room.gateway';
import { PrismaService } from 'prisma/prisma.service';
import { ChatService } from './chat.service';
import { JwtModule } from '@nestjs/jwt';
import { OptionalJwtAuthGuard } from 'src/auth/guard/optional-jwt-auth.guard';

@Module({
  imports: [JwtModule.register({})],
  providers: [
    RoomGateway,
    RoomService,
    PrismaService,
    ChatService,
    OptionalJwtAuthGuard,
  ],
})
export class RoomModule {}
