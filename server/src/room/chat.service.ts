import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';

interface Chat {
  memberId: number;
  message: string;
  createdAt: Date;
}

@Injectable()
export class ChatService {
  constructor(private readonly redisService: RedisService) {}

  private getChatKey(roomCode: string) {
    return `${roomCode}:chats`;
  }

  async sendChat(roomCode: string, chat: Chat) {
    const key = this.getChatKey(roomCode);

    await this.redisService.redis.rpush(key, JSON.stringify(chat));
    await this.redisService.redis.ltrim(key, -50, -1);
    await this.redisService.redis.expire(key, 60 * 60 * 24);

    return chat;
  }

  async getChats(roomCode: string) {
    const key = this.getChatKey(roomCode);

    const chats = await this.redisService.redis.lrange(key, 0, -1);

    return chats.map((chat) => JSON.parse(chat));
  }
}
