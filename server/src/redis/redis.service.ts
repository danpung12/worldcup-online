import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  readonly redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
  }
}
