import { ListerUtilisateursUseCase } from './lister-utilisateurs.use-case';
import type { UtilisateurRepository } from '../../../domain/utilisateur/repositories/utilisateur.repository.interface';
import { Utilisateur } from '../../../domain/utilisateur/entities/utilisateur.entity';

function buildUtilisateur(overrides: Partial<Utilisateur> = {}): Utilisateur {
  return {
    id: 'utilisateur-1',
    providerId: 'demo-admin',
    provider: 'firebase',
    displayName: 'Admin Démo',
    email: 'admin.demo@orange.com',
    role: 'admin',
    dateApparition: '2026-06-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('ListerUtilisateursUseCase', () => {
  it('délègue à utilisateurRepository.findAll() et retourne tous les utilisateurs', async () => {
    const utilisateursAttendus: Utilisateur[] = [
      buildUtilisateur({ id: 'utilisateur-1', role: 'admin' }),
      buildUtilisateur({
        id: 'utilisateur-2',
        providerId: 'demo-capitaine',
        displayName: 'Capitaine Démo',
        email: 'capitaine.demo@orange.com',
        role: 'membre',
      }),
    ];
    const utilisateurs: jest.Mocked<UtilisateurRepository> = {
      findAll: jest.fn().mockResolvedValue(utilisateursAttendus),
      findById: jest.fn(),
      save: jest.fn(),
      findByProviderId: jest.fn(),
      updateRole: jest.fn(),
    };

    const useCase = new ListerUtilisateursUseCase(utilisateurs);
    const result = await useCase.execute();

    expect(result).toBe(utilisateursAttendus);
    expect(utilisateurs.findAll).toHaveBeenCalledTimes(1);
  });
});
