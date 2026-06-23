import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';

export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor() {
    super({
      clientID: process.env.FACEBOOK_APP_ID!,
      clientSecret: process.env.FACEBOOK_APP_SECRET!,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL!,
      profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
      scope: ['email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    return {
      provider: 'facebook',
      providerId: profile.id,
      email: profile.emails?.[0]?.value,
      fullname:
        `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim(),
      avatar: profile.photos?.[0]?.value,
    };
  }
}
