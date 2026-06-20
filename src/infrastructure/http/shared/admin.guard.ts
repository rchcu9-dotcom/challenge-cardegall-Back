import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import type { AuthServicePort } from '../../../domain/auth/ports/auth-service.port';
import {
  AUTH_SERVICE,
  UTILISATEUR_REPOSITORY,
} from '../../../domain/shared/tokens';
import type { ProviderUtilisateur } from '../../../domain/utilisateur/entities/utilisateur.entity';
import type { UtilisateurRepository } from '../../../domain/utilisateur/repositories/utilisateur.repository.interface';
import { REQUIRE_ADMIN_KEY } from './require-admin.decorator';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
    @Inject(UTILISATEUR_REPOSITORY)
    private readonly utilisateurRepository: UtilisateurRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireAdmin = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requireAdmin) return true;

    const token = this.extractBearer(context);
    if (!token) throw new UnauthorizedException();

    const payload = await this.authService.validateToken(token);
    if (!payload) throw new UnauthorizedException();

    // Auto-provisioning (AC-2 / AC-3) : upsert à chaque requête admin authentifiée.
    const now = new Date().toISOString();
    const existing = await this.utilisateurRepository.findByProviderId(
      payload.uid,
    );

    if (!existing) {
      await this.utilisateurRepository.save({
        id: randomUUID(),
        providerId: payload.uid,
        provider: (payload.provider as ProviderUtilisateur) ?? 'google',
        displayName: payload.displayName ?? payload.email ?? payload.uid,
        email: payload.email,
        role: 'membre',
        dateApparition: now,
        derniereConnexion: now,
      });
    } else {
      await this.utilisateurRepository.save({
        ...existing,
        derniereConnexion: now,
      });
    }

    const user =
      existing ??
      (await this.utilisateurRepository.findByProviderId(payload.uid));
    if (!user || user.role !== 'admin') throw new ForbiddenException();
    return true;
  }

  private extractBearer(context: ExecutionContext): string | null {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers['authorization'];
    if (!authorization || !authorization.startsWith('Bearer ')) return null;
    const token = authorization.slice(7).trim();
    return token || null;
  }
}
