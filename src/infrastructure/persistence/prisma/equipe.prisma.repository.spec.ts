import { EquipePrismaRepository } from './equipe.prisma.repository';
import type { Equipe } from '../../../domain/equipe/entities/equipe.entity';
import type { PrismaService } from './prisma.service';

function buildEquipeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'equipe-1',
    nom: 'DSI',
    capitaineUserId: 'demo-dsi',
    capitainePseudo: 'CapiDSI',
    nbJoueursApprox: 10,
    nbFemininesEnvisage: 2,
    commentaire: null,
    statut: 'inscrite',
    nbFemininesReel: null,
    ordreArrivee: null,
    dateInscription: '2026-06-13T08:00:00.000Z',
    dateEnrolement: null,
    ...overrides,
  };
}

function buildEquipe(overrides: Partial<Equipe> = {}): Equipe {
  return {
    id: 'equipe-1',
    nom: 'DSI',
    capitaineUserId: 'demo-dsi',
    capitainePseudo: 'CapiDSI',
    nbJoueursApprox: 10,
    nbFemininesEnvisage: 2,
    statut: 'inscrite',
    dateInscription: '2026-06-13T08:00:00.000Z',
    ...overrides,
  };
}

describe('EquipePrismaRepository', () => {
  let prisma: { equipe: Record<string, jest.Mock>; $transaction: jest.Mock };
  let repository: EquipePrismaRepository;

  beforeEach(() => {
    prisma = {
      equipe: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    repository = new EquipePrismaRepository(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('appelle prisma.equipe.findMany() et mappe les lignes vers le domain', async () => {
      prisma.equipe.findMany.mockResolvedValue([buildEquipeRow()]);

      const result = await repository.findAll();

      expect(prisma.equipe.findMany).toHaveBeenCalledWith();
      expect(result).toEqual([buildEquipe()]);
    });
  });

  describe('findById', () => {
    it('appelle prisma.equipe.findUnique({ where: { id } }) et mappe la ligne', async () => {
      prisma.equipe.findUnique.mockResolvedValue(buildEquipeRow());

      const result = await repository.findById('equipe-1');

      expect(prisma.equipe.findUnique).toHaveBeenCalledWith({ where: { id: 'equipe-1' } });
      expect(result).toEqual(buildEquipe());
    });

    it('retourne null si la ligne est introuvable', async () => {
      prisma.equipe.findUnique.mockResolvedValue(null);

      const result = await repository.findById('inconnue');

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('appelle prisma.equipe.upsert avec create/update sur id et mappe le résultat', async () => {
      const equipe = buildEquipe({ statut: 'enrolee', ordreArrivee: 1, nbFemininesReel: 3 });
      prisma.equipe.upsert.mockResolvedValue(
        buildEquipeRow({ statut: 'enrolee', ordreArrivee: 1, nbFemininesReel: 3 }),
      );

      const result = await repository.save(equipe);

      expect(prisma.equipe.upsert).toHaveBeenCalledWith({
        where: { id: equipe.id },
        create: expect.objectContaining({ id: equipe.id, statut: 'enrolee' }),
        update: expect.objectContaining({ id: equipe.id, statut: 'enrolee' }),
      });
      expect(result).toMatchObject({ statut: 'enrolee', ordreArrivee: 1, nbFemininesReel: 3 });
    });

    it('mappe les champs optionnels absents en null pour la persistance', async () => {
      const equipe = buildEquipe();
      prisma.equipe.upsert.mockResolvedValue(buildEquipeRow());

      await repository.save(equipe);

      const { create } = prisma.equipe.upsert.mock.calls[0][0];
      expect(create.commentaire).toBeNull();
      expect(create.nbFemininesReel).toBeNull();
      expect(create.ordreArrivee).toBeNull();
      expect(create.dateEnrolement).toBeNull();
    });
  });

  describe('findEnroleesOrdered', () => {
    it('filtre par statut "enrolee" et trie par ordreArrivee asc', async () => {
      prisma.equipe.findMany.mockResolvedValue([
        buildEquipeRow({ id: 'e2', statut: 'enrolee', ordreArrivee: 1 }),
        buildEquipeRow({ id: 'e1', statut: 'enrolee', ordreArrivee: 2 }),
      ]);

      const result = await repository.findEnroleesOrdered();

      expect(prisma.equipe.findMany).toHaveBeenCalledWith({
        where: { statut: 'enrolee' },
        orderBy: { ordreArrivee: 'asc' },
      });
      expect(result.map((e) => e.id)).toEqual(['e2', 'e1']);
    });
  });

  describe('reorder', () => {
    it('exécute une transaction avec un update par équipe, ordreArrivee = index + 1', async () => {
      prisma.$transaction.mockResolvedValue([]);

      await repository.reorder(['e2', 'e1']);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const operations = prisma.$transaction.mock.calls[0][0];
      expect(operations).toHaveLength(2);
      expect(prisma.equipe.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'e2' },
        data: { ordreArrivee: 1 },
      });
      expect(prisma.equipe.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'e1' },
        data: { ordreArrivee: 2 },
      });
    });
  });
});
