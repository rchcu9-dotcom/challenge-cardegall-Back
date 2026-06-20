import { MatchPrismaRepository } from './match.prisma.repository';
import type { Match } from '../../../domain/match/entities/match.entity';
import type { PrismaService } from './prisma.service';

function buildMatchRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'match-1',
    tourId: 'tour-1',
    equipeAId: 'equipe-1',
    equipeBId: 'equipe-2',
    estBye: false,
    terrain: 'A',
    heureDebutPrevue: '2026-06-13T08:00:00.000Z',
    heureFinPrevue: '2026-06-13T08:15:00.000Z',
    scoreA: null,
    scoreB: null,
    statut: 'a_jouer',
    ...overrides,
  };
}

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    tourId: 'tour-1',
    equipeAId: 'equipe-1',
    equipeBId: 'equipe-2',
    estBye: false,
    terrain: 'A',
    heureDebutPrevue: '2026-06-13T08:00:00.000Z',
    heureFinPrevue: '2026-06-13T08:15:00.000Z',
    scoreA: null,
    scoreB: null,
    statut: 'a_jouer',
    ...overrides,
  };
}

describe('MatchPrismaRepository', () => {
  let prisma: { match: Record<string, jest.Mock>; $transaction: jest.Mock };
  let repository: MatchPrismaRepository;

  beforeEach(() => {
    prisma = {
      match: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    repository = new MatchPrismaRepository(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('appelle prisma.match.findMany() et mappe les lignes', async () => {
      prisma.match.findMany.mockResolvedValue([buildMatchRow()]);

      const result = await repository.findAll();

      expect(prisma.match.findMany).toHaveBeenCalledWith();
      expect(result).toEqual([buildMatch()]);
    });
  });

  describe('findById', () => {
    it('appelle prisma.match.findUnique({ where: { id } })', async () => {
      prisma.match.findUnique.mockResolvedValue(buildMatchRow());

      const result = await repository.findById('match-1');

      expect(prisma.match.findUnique).toHaveBeenCalledWith({ where: { id: 'match-1' } });
      expect(result).toEqual(buildMatch());
    });

    it('retourne null si introuvable', async () => {
      prisma.match.findUnique.mockResolvedValue(null);

      expect(await repository.findById('inconnu')).toBeNull();
    });
  });

  describe('save', () => {
    it('upsert le match avec id et mappe le résultat', async () => {
      const match = buildMatch({ scoreA: 3, scoreB: 1, statut: 'termine' });
      prisma.match.upsert.mockResolvedValue(buildMatchRow({ scoreA: 3, scoreB: 1, statut: 'termine' }));

      const result = await repository.save(match);

      expect(prisma.match.upsert).toHaveBeenCalledWith({
        where: { id: match.id },
        create: expect.objectContaining({ id: match.id, scoreA: 3, scoreB: 1, statut: 'termine' }),
        update: expect.objectContaining({ scoreA: 3, scoreB: 1, statut: 'termine' }),
      });
      expect(result.scoreA).toBe(3);
      expect(result.statut).toBe('termine');
    });

    it('gère le cas bye : equipeBId null', async () => {
      const match = buildMatch({ equipeBId: null, estBye: true });
      prisma.match.upsert.mockResolvedValue(buildMatchRow({ equipeBId: null, estBye: true }));

      const result = await repository.save(match);

      expect(prisma.match.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ equipeBId: null, estBye: true }),
        }),
      );
      expect(result.equipeBId).toBeNull();
      expect(result.estBye).toBe(true);
    });
  });

  describe('findByTour', () => {
    it('filtre par tourId', async () => {
      prisma.match.findMany.mockResolvedValue([buildMatchRow()]);

      const result = await repository.findByTour('tour-1');

      expect(prisma.match.findMany).toHaveBeenCalledWith({ where: { tourId: 'tour-1' } });
      expect(result).toEqual([buildMatch()]);
    });
  });

  describe('saveMany', () => {
    it('exécute une transaction avec un upsert par match et retourne la liste fournie', async () => {
      const matches = [buildMatch({ id: 'm1' }), buildMatch({ id: 'm2' })];
      prisma.$transaction.mockResolvedValue([]);

      const result = await repository.saveMany(matches);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const operations = prisma.$transaction.mock.calls[0][0];
      expect(operations).toHaveLength(2);
      expect(prisma.match.upsert).toHaveBeenNthCalledWith(1, {
        where: { id: 'm1' },
        create: expect.objectContaining({ id: 'm1' }),
        update: expect.objectContaining({ id: 'm1' }),
      });
      expect(prisma.match.upsert).toHaveBeenNthCalledWith(2, {
        where: { id: 'm2' },
        create: expect.objectContaining({ id: 'm2' }),
        update: expect.objectContaining({ id: 'm2' }),
      });
      expect(result).toBe(matches);
    });

    it('retourne un tableau vide si aucun match fourni', async () => {
      prisma.$transaction.mockResolvedValue([]);

      const result = await repository.saveMany([]);

      expect(prisma.$transaction).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });
  });
});
