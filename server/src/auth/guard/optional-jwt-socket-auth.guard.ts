import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import cookie from 'cookie';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class OptionalJwtSocketAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const client = context.switchToWs().getClient();
    const cookies = cookie.parse(client.handshake.headers.cookie ?? '');
    const token = cookies.accessToken;

    if (!token) {
      return true;
    }

    const payload = await this.jwtService.verifyAsync(token, {
      secret: process.env.JWT_ACCESS_SECRET,
    });

    client.data.user = { id: payload.sub };

    return true;
  }
}
