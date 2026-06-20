import { NotFoundException } from '@nestjs/common';
import { UtilisateurPrismaRepository } from './utilisateur.prisma.repository';
import type { Utilisateur } from '../../../domain/utilisateur/entities/utilisateur.entity';
import type { PrismaService } from './prisma.service';

function buildUtilisateurRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'utilisateur-1',
    providerId: 'google-uid-1',
    provider: 'google',
    email: 'capi@example.com',
    displayName: 'Capi DSI',
    role: 'membre',
    dateApparition: '2026-06-13T08:00:00.000Z',
    derniereConnexion: '2026-06-13T08:00:00.000Z',
    ...overrides,
  };
}

function buildUtilisateur(overrides: Partial<Utilisateur> = {}): Utilisateur {
  return {
    id: 'utilisateur-1',
    providerId: 'google-uid-1',
    provider: 'google',
    email: 'capi@example.com',
    displayName: 'Capi DSI',
    role: 'membre',
    dateApparition: '2026-06-13T08:00:00.000Z',
    derniereConnexion: '2026-06-13T08:00:00.000Z',
    ...overrides,
  };
}

describe('UtilisateurPrismaRepository', () => {
  let prisma: { utilisateur: Record<string, jest.Mock> };
  let repository: UtilisateurPrismaRepository;

  beforeEach(() => {
    prisma = {
      utilisateur: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };
    repository = new UtilisateurPrismaRepository(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('appelle prisma.utilisateur.findMany() et mappe les lignes vers le domain', async () => {
      prisma.utilisateur.findMany.mockResolvedValue([buildUtilisateurRow()]);

      const result = await repository.findAll();

      expect(prisma.utilisateur.findMany).toHaveBeenCalledWith();
      expect(result).toEqual([buildUtilisateur()]);
    });
  });

  describe('findById', () => {
    it('appelle prisma.utilisateur.findUnique({ where: { id } }) et mappe la ligne', async () => {
      prisma.utilisateur.findUnique.mockResolvedValue(buildUtilisateurRow());

      const result = await repository.findById('utilisateur-1');

      expect(prisma.utilisateur.findUnique).toHaveBeenCalledWith({ where: { id: 'utilisateur-1' } });
      expect(result).toEqual(buildUtilisateur());
    });

    it('retourne null si la ligne est introuvable', async () => {
      prisma.utilisateur.findUnique.mockResolvedValue(null);

      const result = await repository.findById('inconnu');

      expect(result).toBeNull();
    });
  });

  describe('findByProviderId', () => {
    it('appelle prisma.utilisateur.findUnique({ where: { providerId } }) et mappe la ligne', async () => {
      prisma.utilisateur.findUnique.mockResolvedValue(buildUtilisateurRow());

      const result = await repository.findByProviderId('google-uid-1');

      expect(prisma.utilisateur.findUnique).toHaveBeenCalledWith({ where: { providerId: 'google-uid-1' } });
      expect(result).toEqual(buildUtilisateur());
    });

    it('retourne null si aucun utilisateur ne correspond au providerId', async () => {
      prisma.utilisateur.findUnique.mockResolvedValue(null);

      const result = await repository.findByProviderId('inconnu');

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('upsert avec id et mappe le résultat', async () => {
      const utilisateur = buildUtilisateur({ role: 'capitaine' });
      prisma.utilisateur.upsert.mockResolvedValue(buildUtilisateurRow({ role: 'capitaine' }));

      const result = await repository.save(utilisateur);

      expect(prisma.utilisateur.upsert).toHaveBeenCalledWith({
        where: { id: utilisateur.id },
        create: expect.objectContaining({ id: utilisateur.id, role: 'capitaine' }),
        update: expect.objectContaining({ role: 'capitaine' }),
      });
      expect(result).toEqual(buildUtilisateur({ role: 'capitaine' }));
    });

    it('retombe sur dateApparition si derniereConnexion est absente', async () => {
      const utilisateur = buildUtilisateur({ derniereConnexion: undefined });
      prisma.utilisateur.upsert.mockResolvedValue(buildUtilisateurRow());

      await repository.save(utilisateur);

      const { create } = prisma.utilisateur.upsert.mock.calls[0][0];
      expect(create.derniereConnexion).toBe(utilisateur.dateApparition);
    });

    it('mappe email absent en chaîne vide pour la persistance', async () => {
      const utilisateur = buildUtilisateur({ email: undefined });
      prisma.utilisateur.upsert.mockResolvedValue(buildUtilisateurRow());

      await repository.save(utilisateur);

      const { create } = prisma.utilisateur.upsert.mock.calls[0][0];
      expect(create.email).toBe('');
    });
  });

  describe('updateRole', () => {
    it('met à jour le rôle et mappe le résultat', async () => {
      prisma.utilisateur.update.mockResolvedValue(buildUtilisateurRow({ role: 'admin' }));

      const result = await repository.updateRole('utilisateur-1', 'admin');

      expect(prisma.utilisateur.update).toHaveBeenCalledWith({
        where: { id: 'utilisateur-1' },
        data: { role: 'admin' },
      });
      expect(result).toEqual(buildUtilisateur({ role: 'admin' }));
    });

    it('lève NotFoundException si l\'utilisateur est introuvable', async () => {
      prisma.utilisateur.update.mockRejectedValue(new Error('Record to update not found'));

      await expect(repository.updateRole('inconnu', 'admin')).rejects.toThrow(NotFoundException);
    });
  });
});
