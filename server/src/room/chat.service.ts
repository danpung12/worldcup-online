import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

interface Chat {
  memberId: number;
  message: string;
  createdAt: Date;
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  private chatMap = new Map<string, Chat[]>();

  sendChat(roomCode: string, chat: Chat) {
    if (!this.chatMap.has(roomCode)) {
      this.chatMap.set(roomCode, []);
    }
    const chats = this.chatMap.get(roomCode)!;

    chats.push(chat);

    if (chats.length > 50) {
      chats.shift();
    }

    return chat;
  }

  getChats(roomCode: string) {
    return this.chatMap.get(roomCode) ?? [];
  }
}
