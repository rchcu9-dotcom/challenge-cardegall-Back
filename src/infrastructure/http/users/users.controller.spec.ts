import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { ListerUtilisateursUseCase } from '../../../application/utilisateur/use-cases/lister-utilisateurs.use-case';
import { ModifierRoleUtilisateurUseCase } from '../../../application/utilisateur/use-cases/modifier-role-utilisateur.use-case';
import { REQUIRE_ADMIN_KEY } from '../shared/require-admin.decorator';
import { Utilisateur } from '../../../domain/utilisateur/entities/utilisateur.entity';

function buildUtilisateur(overrides: Partial<Utilisateur> = {}): Utilisateur {
  return {
    id: 'utilisateur-1',
    userId: 'demo-capitaine',
    displayName: 'Capitaine Démo',
    email: 'capitaine.demo@orange.com',
    role: 'membre',
    dateApparition: '2026-06-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('UsersController', () => {
  let controller: UsersController;
  let listerUtilisateursUseCase: jest.Mocked<ListerUtilisateursUseCase>;
  let modifierRoleUtilisateurUseCase: jest.Mocked<ModifierRoleUtilisateurUseCase>;

  beforeEach(async () => {
    listerUtilisateursUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ListerUtilisateursUseCase>;
    modifierRoleUtilisateurUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ModifierRoleUtilisateurUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: ListerUtilisateursUseCase, useValue: listerUtilisateursUseCase },
        { provide: ModifierRoleUtilisateurUseCase, useValue: modifierRoleUtilisateurUseCase },
      ],
    }).compile();

    controller = module.get(UsersController);
  });

  it('GET /users délègue à ListerUtilisateursUseCase et retourne des UtilisateurDto', async () => {
    listerUtilisateursUseCase.execute.mockResolvedValue([
      buildUtilisateur({ id: 'utilisateur-1', role: 'admin' }),
      buildUtilisateur({ id: 'utilisateur-2', role: 'membre' }),
    ]);

    const result = await controller.findAll();

    expect(listerUtilisateursUseCase.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      buildUtilisateur({ id: 'utilisateur-1', role: 'admin' }),
      buildUtilisateur({ id: 'utilisateur-2', role: 'membre' }),
    ]);
  });

  it('PATCH /users/:id/role délègue à ModifierRoleUtilisateurUseCase avec id et dto', async () => {
    const dto = { role: 'admin' as const };
    modifierRoleUtilisateurUseCase.execute.mockResolvedValue(
      buildUtilisateur({ id: 'utilisateur-1', role: 'admin' }),
    );

    const result = await controller.modifierRole('utilisateur-1', dto);

    expect(modifierRoleUtilisateurUseCase.execute).toHaveBeenCalledWith('utilisateur-1', dto);
    expect(result.role).toBe('admin');
  });

  it("GET /users (findAll) n’est pas marque @RequireAdmin()", () => {
    const meta = Reflect.getMetadata(REQUIRE_ADMIN_KEY, UsersController.prototype.findAll);

    expect(meta).toBeUndefined();
  });

  it("PATCH /users/:id/role est marque @RequireAdmin()", () => {
    const meta = Reflect.getMetadata(REQUIRE_ADMIN_KEY, UsersController.prototype.modifierRole);

    expect(meta).toBe(true);
  });
});
