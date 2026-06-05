import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: (req: Request) => req.cookies.accessToken ?? null,
      secretOrKey: process.env.JWT_ACCESS_SECRET!,
    });
  }

  validate(payload) {
    return { id: payload.sub };
  }
}
