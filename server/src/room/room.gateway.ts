import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { RoomService } from './room.service';
import { Server, Socket } from 'socket.io';
import { CreateRoomDto } from './dto/create-room.dto';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'https://worldcup-online.vercel.app'],
  },
})
export class RoomGateway {
  constructor(private readonly roomService: RoomService) {}

  @WebSocketServer()
  server!: Server;

  // 초대 코드로 방 입장.
  @SubscribeMessage('joinRoom')
  async joinRoom(
    @MessageBody() body: { roomCode: string; nickname: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { room, member } = await this.roomService.joinRoom(
      body.roomCode,
      body.nickname,
    );

    client.join(body.roomCode);
    client.data.roomCode = body.roomCode;
    client.data.memberId = member.id;

    this.server.to(body.roomCode).emit('roomUpdate', room);

    return { message: '방에 입장했습니다.', member, room };
  }

  //방 생성
  @SubscribeMessage('createRoom')
  async createRoom(
    @MessageBody() body: CreateRoomDto,
    @ConnectedSocket() client: Socket,
  ) {
    const room = await this.roomService.createRoom(body);
    client.join(room.room_code);
    client.data.roomCode = room.room_code;
    client.data.memberId = room.member[0].id;

    return { message: '방이 생성되었습니다', roomCode: room.room_code, room };
  }

  @SubscribeMessage('startGame')
  async startGame(@ConnectedSocket() client: Socket) {
    const result = await this.roomService.startGame(
      client.data.roomCode,
      client.data.memberId,
    );
    this.server.to(client.data.roomCode).emit('gameUpdate', result);
  }

  @SubscribeMessage('vote')
  async vote(
    @MessageBody() body: { selectItemId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const result = await this.roomService.vote(
      client.data.roomCode,
      body.selectItemId,
      client.data.memberId,
    );

    this.server.to(client.data.roomCode).emit('gameUpdate', result);

    return result;
  }
}
