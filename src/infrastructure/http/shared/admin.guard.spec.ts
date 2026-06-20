import 'reflect-metadata';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminGuard } from './admin.guard';
import { REQUIRE_ADMIN_KEY } from './require-admin.decorator';
import type { AuthServicePort } from '../../../domain/auth/ports/auth-service.port';
import type { UtilisateurRepository } from '../../../domain/utilisateur/repositories/utilisateur.repository.interface';
import type { Utilisateur } from '../../../domain/utilisateur/entities/utilisateur.entity';

function buildContext(authorization?: string): ExecutionContext {
  const request = { headers: { authorization } };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function buildUtilisateur(overrides: Partial<Utilisateur> = {}): Utilisateur {
  return {
    id: 'utilisateur-1',
    providerId: 'firebase-uid-1',
    provider: 'google',
    displayName: 'Test User',
    email: 'test@example.com',
    role: 'membre',
    dateApparition: '2026-06-16T00:00:00.000Z',
    derniereConnexion: '2026-06-16T00:00:00.000Z',
    ...overrides,
  };
}

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let reflector: jest.Mocked<Reflector>;
  let authService: jest.Mocked<AuthServicePort>;
  let utilisateurRepository: jest.Mocked<UtilisateurRepository>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
    authService = { validateToken: jest.fn() } as jest.Mocked<AuthServicePort>;
    utilisateurRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      findByProviderId: jest.fn(),
      updateRole: jest.fn(),
    } as jest.Mocked<UtilisateurRepository>;

    guard = new AdminGuard(reflector, authService, utilisateurRepository);
  });

  describe('route sans @RequireAdmin()', () => {
    it('retourne true sans interroger le token ni le repository', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = buildContext(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authService.validateToken).not.toHaveBeenCalled();
      expect(utilisateurRepository.findByProviderId).not.toHaveBeenCalled();
    });

    it('retourne true même si REQUIRE_ADMIN_KEY est false', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      const result = await guard.canActivate(buildContext(undefined));

      expect(result).toBe(true);
    });

    it('lit les métadonnées depuis getHandler et getClass', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const handler = () => {};
      const cls = class {};
      const context = {
        switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
        getHandler: () => handler,
        getClass: () => cls,
      } as unknown as ExecutionContext;

      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRE_ADMIN_KEY, [handler, cls]);
    });
  });

  describe('route avec @RequireAdmin()', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(true);
    });

    // --- AC-5 : 401 si pas de token ou token invalide ---

    it('AC-5 : lève UnauthorizedException si Authorization est absent', async () => {
      await expect(guard.canActivate(buildContext(undefined))).rejects.toThrow(UnauthorizedException);
      expect(authService.validateToken).not.toHaveBeenCalled();
    });

    it("AC-5 : lève UnauthorizedException si Authorization n'est pas préfixé Bearer", async () => {
      await expect(guard.canActivate(buildContext('Basic dXNlcjpwYXNz'))).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.validateToken).not.toHaveBeenCalled();
    });

    it('AC-5 : lève UnauthorizedException si Bearer est suivi d\'une chaîne vide', async () => {
      await expect(guard.canActivate(buildContext('Bearer '))).rejects.toThrow(UnauthorizedException);
      expect(authService.validateToken).not.toHaveBeenCalled();
    });

    it('AC-5 : lève UnauthorizedException si validateToken retourne null', async () => {
      authService.validateToken.mockResolvedValue(null);

      await expect(guard.canActivate(buildContext('Bearer invalid-token'))).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.validateToken).toHaveBeenCalledWith('invalid-token');
    });

    it('AC-5 : passe le token exact à validateToken (sans le préfixe "Bearer ")', async () => {
      authService.validateToken.mockResolvedValue(null);

      await expect(guard.canActivate(buildContext('Bearer eyJhbGci.payload.sig'))).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.validateToken).toHaveBeenCalledWith('eyJhbGci.payload.sig');
    });

    // --- AC-6 : 403 si utilisateur role !== admin ---

    it('AC-6 : lève ForbiddenException si utilisateur existant avec role=membre', async () => {
      authService.validateToken.mockResolvedValue({ uid: 'firebase-uid-1', email: 'membre@example.com' });
      const membre = buildUtilisateur({ role: 'membre' });
      utilisateurRepository.findByProviderId.mockResolvedValue(membre);
      utilisateurRepository.save.mockResolvedValue({ ...membre, derniereConnexion: new Date().toISOString() });

      await expect(guard.canActivate(buildContext('Bearer valid-token'))).rejects.toThrow(
        ForbiddenException,
      );
    });

    // --- AC-7 : 200 si utilisateur admin ---

    it('AC-7 : retourne true si utilisateur existant avec role=admin', async () => {
      authService.validateToken.mockResolvedValue({ uid: 'firebase-uid-admin', email: 'admin@example.com' });
      const admin = buildUtilisateur({ role: 'admin' });
      utilisateurRepository.findByProviderId.mockResolvedValue(admin);
      utilisateurRepository.save.mockResolvedValue({ ...admin, derniereConnexion: new Date().toISOString() });

      const result = await guard.canActivate(buildContext('Bearer valid-token'));
      expect(result).toBe(true);
    });

    it("AC-7 : n'appelle pas findByProviderId une seconde fois quand l'utilisateur existant est admin", async () => {
      authService.validateToken.mockResolvedValue({ uid: 'admin-uid' });
      const admin = buildUtilisateur({ role: 'admin' });
      utilisateurRepository.findByProviderId.mockResolvedValue(admin);
      utilisateurRepository.save.mockResolvedValue(admin);

      await guard.canActivate(buildContext('Bearer token'));

      expect(utilisateurRepository.findByProviderId).toHaveBeenCalledTimes(1);
    });

    // --- AC-2 : provisioning nouvel utilisateur ---

    it('AC-2 : provisionne un nouvel utilisateur avec role=membre et dateApparition', async () => {
      authService.validateToken.mockResolvedValue({
        uid: 'new-uid',
        email: 'new@example.com',
        displayName: 'Nouvel User',
      });
      const savedUser = buildUtilisateur({ providerId: 'new-uid', role: 'membre' });
      utilisateurRepository.findByProviderId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(savedUser);
      utilisateurRepository.save.mockResolvedValue(savedUser);

      await expect(guard.canActivate(buildContext('Bearer token'))).rejects.toThrow(ForbiddenException);

      expect(utilisateurRepository.save).toHaveBeenCalledTimes(1);
      expect(utilisateurRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: 'new-uid',
          provider: 'google',
          displayName: 'Nouvel User',
          email: 'new@example.com',
          role: 'membre',
          dateApparition: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          derniereConnexion: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        }),
      );
    });

    it('AC-2 : génère un UUID valide pour le nouvel utilisateur', async () => {
      authService.validateToken.mockResolvedValue({ uid: 'uid-abc', email: 'x@example.com' });
      const savedUser = buildUtilisateur({ providerId: 'uid-abc', role: 'membre' });
      utilisateurRepository.findByProviderId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(savedUser);
      utilisateurRepository.save.mockResolvedValue(savedUser);

      await expect(guard.canActivate(buildContext('Bearer token'))).rejects.toThrow(ForbiddenException);

      const saved = utilisateurRepository.save.mock.calls[0][0];
      expect(saved.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('AC-2 : utilise email comme displayName si displayName est absent', async () => {
      authService.validateToken.mockResolvedValue({ uid: 'no-name-uid', email: 'fallback@example.com' });
      const savedUser = buildUtilisateur({ providerId: 'no-name-uid', role: 'membre' });
      utilisateurRepository.findByProviderId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(savedUser);
      utilisateurRepository.save.mockResolvedValue(savedUser);

      await expect(guard.canActivate(buildContext('Bearer token'))).rejects.toThrow(ForbiddenException);

      expect(utilisateurRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: 'fallback@example.com' }),
      );
    });

    it('AC-2 : utilise uid comme displayName si email et displayName sont tous deux absents', async () => {
      authService.validateToken.mockResolvedValue({ uid: 'bare-uid' });
      const savedUser = buildUtilisateur({ providerId: 'bare-uid', role: 'membre' });
      utilisateurRepository.findByProviderId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(savedUser);
      utilisateurRepository.save.mockResolvedValue(savedUser);

      await expect(guard.canActivate(buildContext('Bearer token'))).rejects.toThrow(ForbiddenException);

      expect(utilisateurRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: 'bare-uid' }),
      );
    });

    it('AC-2 : appelle findByProviderId une seconde fois après save pour résoudre le user', async () => {
      authService.validateToken.mockResolvedValue({ uid: 'new-uid', email: 'new@example.com' });
      const savedUser = buildUtilisateur({ providerId: 'new-uid', role: 'membre' });
      utilisateurRepository.findByProviderId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(savedUser);
      utilisateurRepository.save.mockResolvedValue(savedUser);

      await expect(guard.canActivate(buildContext('Bearer token'))).rejects.toThrow(ForbiddenException);

      expect(utilisateurRepository.findByProviderId).toHaveBeenCalledTimes(2);
      expect(utilisateurRepository.findByProviderId).toHaveBeenNthCalledWith(1, 'new-uid');
      expect(utilisateurRepository.findByProviderId).toHaveBeenNthCalledWith(2, 'new-uid');
    });

    // --- AC-3 : mise à jour derniereConnexion ---

    it('AC-3 : met à jour derniereConnexion si utilisateur existant (admin) — retourne true', async () => {
      authService.validateToken.mockResolvedValue({ uid: 'admin-uid', email: 'admin@example.com' });
      const existing = buildUtilisateur({
        role: 'admin',
        derniereConnexion: '2026-01-01T00:00:00.000Z',
      });
      utilisateurRepository.findByProviderId.mockResolvedValue(existing);
      utilisateurRepository.save.mockResolvedValue({ ...existing, derniereConnexion: new Date().toISOString() });

      const result = await guard.canActivate(buildContext('Bearer token'));
      expect(result).toBe(true);

      const saved = utilisateurRepository.save.mock.calls[0][0];
      expect(saved.derniereConnexion).not.toBe('2026-01-01T00:00:00.000Z');
      expect(saved.derniereConnexion).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('AC-3 : met à jour derniereConnexion si utilisateur existant (membre) avant ForbiddenException', async () => {
      authService.validateToken.mockResolvedValue({ uid: 'membre-uid', email: 'membre@example.com' });
      const existing = buildUtilisateur({
        role: 'membre',
        derniereConnexion: '2026-01-01T00:00:00.000Z',
      });
      utilisateurRepository.findByProviderId.mockResolvedValue(existing);
      utilisateurRepository.save.mockResolvedValue({ ...existing, derniereConnexion: new Date().toISOString() });

      await expect(guard.canActivate(buildContext('Bearer token'))).rejects.toThrow(ForbiddenException);

      expect(utilisateurRepository.save).toHaveBeenCalledTimes(1);
      const saved = utilisateurRepository.save.mock.calls[0][0];
      expect(saved.derniereConnexion).not.toBe('2026-01-01T00:00:00.000Z');
    });

    it('AC-3 : préserve tous les autres champs lors de la mise à jour derniereConnexion', async () => {
      authService.validateToken.mockResolvedValue({ uid: 'admin-uid' });
      const existing = buildUtilisateur({
        role: 'admin',
        email: 'admin@orange.com',
        displayName: 'Administrateur',
      });
      utilisateurRepository.findByProviderId.mockResolvedValue(existing);
      utilisateurRepository.save.mockResolvedValue(existing);

      await guard.canActivate(buildContext('Bearer token'));

      const saved = utilisateurRepository.save.mock.calls[0][0];
      expect(saved.id).toBe(existing.id);
      expect(saved.providerId).toBe(existing.providerId);
      expect(saved.displayName).toBe(existing.displayName);
      expect(saved.email).toBe(existing.email);
      expect(saved.role).toBe(existing.role);
      expect(saved.dateApparition).toBe(existing.dateApparition);
    });
  });
});
