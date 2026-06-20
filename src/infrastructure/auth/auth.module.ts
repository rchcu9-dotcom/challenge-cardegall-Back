import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AUTH_SERVICE } from '../../domain/shared/tokens';
import { UsersModule } from '../http/users/users.module';
import { AuthController } from './auth.controller';
import { JwtAuthService } from './jwt-auth.service';
import { GoogleStrategy } from './strategies/google.strategy';

@Global()
@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-non-securise-a-changer',
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ||
          '7d') as `${number}${'d' | 'h' | 'm' | 's'}`,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    GoogleStrategy,
    { provide: AUTH_SERVICE, useClass: JwtAuthService },
  ],
  exports: [AUTH_SERVICE],
})
export class AuthModule {}
