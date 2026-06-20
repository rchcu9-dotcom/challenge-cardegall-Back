import { NotFoundException } from '@nestjs/common';
import { ModifierRoleUtilisateurUseCase } from './modifier-role-utilisateur.use-case';
import type { UtilisateurRepository } from '../../../domain/utilisateur/repositories/utilisateur.repository.interface';
import { Utilisateur } from '../../../domain/utilisateur/entities/utilisateur.entity';
import { ModifierRoleUtilisateurDto } from '../dto/modifier-role-utilisateur.dto';

function buildUtilisateur(overrides: Partial<Utilisateur> = {}): Utilisateur {
  return {
    id: 'utilisateur-1',
    providerId: 'demo-capitaine',
    provider: 'firebase',
    displayName: 'Capitaine Démo',
    email: 'capitaine.demo@orange.com',
    role: 'membre',
    dateApparition: '2026-06-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('ModifierRoleUtilisateurUseCase', () => {
  let utilisateurs: jest.Mocked<UtilisateurRepository>;
  let useCase: ModifierRoleUtilisateurUseCase;

  beforeEach(() => {
    utilisateurs = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      findByProviderId: jest.fn(),
      updateRole: jest.fn(),
    };
    useCase = new ModifierRoleUtilisateurUseCase(utilisateurs);
  });

  it("lève NotFoundException si l'utilisateur n'existe pas", async () => {
    utilisateurs.findById.mockResolvedValue(null);
    const dto: ModifierRoleUtilisateurDto = { role: 'admin' };

    await expect(useCase.execute('inconnu', dto)).rejects.toThrow(NotFoundException);
    expect(utilisateurs.updateRole).not.toHaveBeenCalled();
  });

  it('promeut un membre en admin via updateRole', async () => {
    const utilisateur = buildUtilisateur({ role: 'membre' });
    utilisateurs.findById.mockResolvedValue(utilisateur);
    utilisateurs.updateRole.mockResolvedValue({ ...utilisateur, role: 'admin' });
    const dto: ModifierRoleUtilisateurDto = { role: 'admin' };

    const result = await useCase.execute('utilisateur-1', dto);

    expect(utilisateurs.findById).toHaveBeenCalledWith('utilisateur-1');
    expect(utilisateurs.updateRole).toHaveBeenCalledWith('utilisateur-1', 'admin');
    expect(result.role).toBe('admin');
  });

  it('retire le rôle admin (admin -> membre) via updateRole', async () => {
    const utilisateur = buildUtilisateur({ role: 'admin' });
    utilisateurs.findById.mockResolvedValue(utilisateur);
    utilisateurs.updateRole.mockResolvedValue({ ...utilisateur, role: 'membre' });
    const dto: ModifierRoleUtilisateurDto = { role: 'membre' };

    const result = await useCase.execute('utilisateur-1', dto);

    expect(utilisateurs.updateRole).toHaveBeenCalledWith('utilisateur-1', 'membre');
    expect(result.role).toBe('membre');
  });
});
