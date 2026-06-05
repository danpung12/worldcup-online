import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async kakaoLogin(kakaoUser) {
    let user = await this.prisma.user.findFirst({
      where: {
        provider: 'kakao',
        provider_id: kakaoUser.provider_id,
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          nickname: kakaoUser.nickname,
          profile_image: kakaoUser.avatar,
          provider_id: kakaoUser.provider_id,
        },
      });
    }

    const accessToken = await this.jwtService.signAsync(
      { sub: user!.id },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );
    const refreshToken = await this.jwtService.signAsync(
      { sub: user!.id },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '30d' },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  async kakaoRefresh(token: string) {
    if (!token) {
      throw new UnauthorizedException('리프레쉬 토큰이 필요함.');
    }
    let payload;

    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('리프레쉬 토큰이 유효하지 않음.');
    }

    return {
      accessToken: await this.jwtService.signAsync(
        { sub: payload.sub },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
      ),
    };
  }

  async getMe(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },

      select: {
        id: true,
        nickname: true,
        profile_image: true,
      },
    });
  }
}
