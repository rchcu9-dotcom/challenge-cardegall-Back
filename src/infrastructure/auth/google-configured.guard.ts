import { CanActivate, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { isGoogleOAuthConfigured } from './google-oauth.config';

@Injectable()
export class GoogleConfiguredGuard implements CanActivate {
  canActivate(): boolean {
    if (!isGoogleOAuthConfigured()) {
      throw new ServiceUnavailableException(
        'Connexion Google non configurée : renseignez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET ' +
          'dans back/.env.local (console.cloud.google.com), ou utilisez POST /auth/dev-login en local.',
      );
    }
    return true;
  }
}
