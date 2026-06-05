import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';

export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor() {
    super({
      clientID: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
      callbackURL: process.env.KAKAO_CALLBACK_URL!,
    });
  }

  validate(accessToken: string, refreshToken: string, profile: any) {
    console.log(profile);

    return {
      nickname: profile.username,
      avatar: profile._json?.properties?.profile_image,
      provider_id: String(profile.id),
    };
  }
}
