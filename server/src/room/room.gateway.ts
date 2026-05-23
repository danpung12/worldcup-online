import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { RoomService } from './room.service';
import { Socket } from 'socket.io';
import { CreateRoomDto } from './dto/create-room.dto';

@WebSocketGateway({ cors: { origin: 'localhost:3000' } })
export class RoomGateway {
  constructor(private readonly roomService: RoomService) {}

  // 초대 코드로 방 입장.
  @SubscribeMessage('joinRoom')
  joinRoom(
    @MessageBody() body: { roomCode: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(body.roomCode);

    return { message: '방에 입장했습니다.' };
  }

  //방 생성
  @SubscribeMessage('createRoom')
  async createRoom(
    @MessageBody() body: CreateRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    const room = await this.roomService.createRoom(body);
    client.join(room.room_code);

    return { message: '방이 생성되었습니다', roomCode: room.room_code, room };
  }
}
