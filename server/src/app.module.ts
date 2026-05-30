import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UploadModule } from './upload/upload.module';
import { WorldcupModule } from './worldcup/worldcup.module';
import { RoomModule } from './room/room.module';

@Module({
  imports: [UploadModule, WorldcupModule, RoomModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
