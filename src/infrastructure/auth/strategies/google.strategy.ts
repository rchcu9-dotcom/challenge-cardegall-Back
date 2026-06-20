import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';

export interface GoogleProfile {
  providerId: string;
  email?: string;
  displayName: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'unconfigured',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'unconfigured',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3010/auth/google/callback',
      scope: ['profile', 'email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const googleProfile: GoogleProfile = {
      providerId: profile.id,
      email: profile.emails?.[0]?.value,
      displayName: profile.displayName,
    };
    done(null, googleProfile);
  }
}
