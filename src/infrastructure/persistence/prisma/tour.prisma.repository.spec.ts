import { TourPrismaRepository } from './tour.prisma.repository';
import type { ParametresTour, Tour } from '../../../domain/tour/entities/tour.entity';
import type { PrismaService } from './prisma.service';

function buildParametres(): ParametresTour {
  return {
    nomsTerrains: ['A', 'B', 'C'],
    dureeMatchMinutes: 15,
    latenceMinutes: 5,
    delaiDemarrageMinutes: 3,
  };
}

function buildTourRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'tour-1',
    numero: 1,
    statut: 'planifie',
    parametres: buildParametres(),
    equipesBecot: [],
    ...overrides,
  };
}

function buildTour(overrides: Partial<Tour> = {}): Tour {
  return {
    id: 'tour-1',
    numero: 1,
    statut: 'planifie',
    parametres: buildParametres(),
    equipesBecot: [],
    ...overrides,
  };
}

describe('TourPrismaRepository', () => {
  let prisma: { tour: Record<string, jest.Mock> };
  let repository: TourPrismaRepository;

  beforeEach(() => {
    prisma = {
      tour: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
    };
    repository = new TourPrismaRepository(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('appelle prisma.tour.findMany() et mappe les lignes', async () => {
      prisma.tour.findMany.mockResolvedValue([buildTourRow()]);

      const result = await repository.findAll();

      expect(prisma.tour.findMany).toHaveBeenCalledWith();
      expect(result).toEqual([buildTour()]);
    });
  });

  describe('findById', () => {
    it('appelle prisma.tour.findUnique({ where: { id } })', async () => {
      prisma.tour.findUnique.mockResolvedValue(buildTourRow());

      const result = await repository.findById('tour-1');

      expect(prisma.tour.findUnique).toHaveBeenCalledWith({ where: { id: 'tour-1' } });
      expect(result).toEqual(buildTour());
    });

    it('retourne null si introuvable', async () => {
      prisma.tour.findUnique.mockResolvedValue(null);

      expect(await repository.findById('inconnu')).toBeNull();
    });
  });

  describe('save', () => {
    it('upsert avec parametres/equipesBecot sérialisés en JSON et mappe le résultat', async () => {
      const tour = buildTour({ equipesBecot: ['equipe-1'] });
      prisma.tour.upsert.mockResolvedValue(buildTourRow({ equipesBecot: ['equipe-1'] }));

      const result = await repository.save(tour);

      expect(prisma.tour.upsert).toHaveBeenCalledWith({
        where: { id: tour.id },
        create: expect.objectContaining({
          id: tour.id,
          numero: 1,
          statut: 'planifie',
          parametres: buildParametres(),
          equipesBecot: ['equipe-1'],
        }),
        update: expect.objectContaining({
          parametres: buildParametres(),
          equipesBecot: ['equipe-1'],
        }),
      });
      expect(result.equipesBecot).toEqual(['equipe-1']);
    });
  });

  describe('findCurrent', () => {
    it('retourne le tour au statut "en_cours" s\'il existe', async () => {
      prisma.tour.findFirst.mockResolvedValue(buildTourRow({ statut: 'en_cours' }));

      const result = await repository.findCurrent();

      expect(prisma.tour.findFirst).toHaveBeenCalledWith({ where: { statut: 'en_cours' } });
      expect(result?.statut).toBe('en_cours');
    });

    it('retombe sur findLast (dernier numero) si aucun tour "en_cours"', async () => {
      prisma.tour.findFirst
        .mockResolvedValueOnce(null) // recherche "en_cours"
        .mockResolvedValueOnce(buildTourRow({ numero: 3, statut: 'termine' })); // findLast

      const result = await repository.findCurrent();

      expect(prisma.tour.findFirst).toHaveBeenNthCalledWith(1, { where: { statut: 'en_cours' } });
      expect(prisma.tour.findFirst).toHaveBeenNthCalledWith(2, { orderBy: { numero: 'desc' } });
      expect(result?.numero).toBe(3);
    });

    it('retourne null si aucun tour "en_cours" ni aucun tour du tout', async () => {
      prisma.tour.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      const result = await repository.findCurrent();

      expect(result).toBeNull();
    });
  });

  describe('findLast', () => {
    it('appelle prisma.tour.findFirst({ orderBy: { numero: "desc" } })', async () => {
      prisma.tour.findFirst.mockResolvedValue(buildTourRow({ numero: 2 }));

      const result = await repository.findLast();

      expect(prisma.tour.findFirst).toHaveBeenCalledWith({ orderBy: { numero: 'desc' } });
      expect(result?.numero).toBe(2);
    });

    it('retourne null si aucun tour', async () => {
      prisma.tour.findFirst.mockResolvedValue(null);

      expect(await repository.findLast()).toBeNull();
    });
  });
});
