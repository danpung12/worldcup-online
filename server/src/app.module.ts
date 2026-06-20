import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UploadModule } from './upload/upload.module';
import { WorldcupModule } from './worldcup/worldcup.module';
import { RoomModule } from './room/room.module';
import { AuthModule } from './auth/auth.module';
import { CommentModule } from './comment/comment.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [UploadModule, WorldcupModule, RoomModule, AuthModule, CommentModule, RedisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
