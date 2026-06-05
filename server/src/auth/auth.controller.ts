import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Body,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    } as const;
  }

  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  kakaoLogin() {}

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  async callback(@Req() req, @Res() res) {
    const { accessToken, refreshToken } = await this.authService.kakaoLogin(
      req.user,
    );
    res.cookie('accessToken', accessToken, this.getCookieOptions());
    res.cookie('refreshToken', refreshToken, this.getCookieOptions());

    return res.redirect(`${process.env.FRONTEND_URL}?login=success`);
  }

  @Post('refresh')
  async refresh(@Body('token') token: string) {
    return this.authService.kakaoRefresh(token);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res) {
    res.clearCookie('accessToken', this.getCookieOptions());
    res.clearCookie('refreshToken', this.getCookieOptions());
  }
}
