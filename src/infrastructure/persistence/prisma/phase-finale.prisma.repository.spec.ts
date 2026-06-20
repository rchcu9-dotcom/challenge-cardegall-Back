import { PhaseFinalePrismaRepository } from './phase-finale.prisma.repository';
import type { PhaseFinale } from '../../../domain/finale/entities/phase-finale.entity';
import type { PrismaService } from './prisma.service';

function buildPhaseFinaleRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'phase-finale-1',
    demiFinaleAId: 'demi-a',
    demiFinaleBId: 'demi-b',
    finaleCardebatId: null,
    finaleLeGallId: null,
    statut: 'en_cours',
    ...overrides,
  };
}

function buildPhaseFinale(overrides: Partial<PhaseFinale> = {}): PhaseFinale {
  return {
    id: 'phase-finale-1',
    demiFinaleAId: 'demi-a',
    demiFinaleBId: 'demi-b',
    finaleCardebatId: null,
    finaleLeGallId: null,
    statut: 'en_cours',
    ...overrides,
  };
}

describe('PhaseFinalePrismaRepository', () => {
  let prisma: { phaseFinale: Record<string, jest.Mock> };
  let repository: PhaseFinalePrismaRepository;

  beforeEach(() => {
    prisma = {
      phaseFinale: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
    };
    repository = new PhaseFinalePrismaRepository(prisma as unknown as PrismaService);
  });

  describe('obtenir', () => {
    it('appelle prisma.phaseFinale.findFirst() et mappe la ligne vers le domain', async () => {
      prisma.phaseFinale.findFirst.mockResolvedValue(buildPhaseFinaleRow());

      const result = await repository.obtenir();

      expect(prisma.phaseFinale.findFirst).toHaveBeenCalledWith();
      expect(result).toEqual(buildPhaseFinale());
    });

    it('retourne null si aucune phase finale n\'existe encore', async () => {
      prisma.phaseFinale.findFirst.mockResolvedValue(null);

      const result = await repository.obtenir();

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('upsert la phase finale avec id et mappe le résultat', async () => {
      const phaseFinale = buildPhaseFinale({
        finaleCardebatId: 'finale-cardebat',
        finaleLeGallId: 'finale-le-gall',
        statut: 'terminee',
      });
      prisma.phaseFinale.upsert.mockResolvedValue(
        buildPhaseFinaleRow({
          finaleCardebatId: 'finale-cardebat',
          finaleLeGallId: 'finale-le-gall',
          statut: 'terminee',
        }),
      );

      const result = await repository.save(phaseFinale);

      expect(prisma.phaseFinale.upsert).toHaveBeenCalledWith({
        where: { id: phaseFinale.id },
        create: expect.objectContaining({
          id: phaseFinale.id,
          finaleCardebatId: 'finale-cardebat',
          finaleLeGallId: 'finale-le-gall',
          statut: 'terminee',
        }),
        update: expect.objectContaining({
          finaleCardebatId: 'finale-cardebat',
          finaleLeGallId: 'finale-le-gall',
          statut: 'terminee',
        }),
      });
      expect(result).toEqual(
        buildPhaseFinale({
          finaleCardebatId: 'finale-cardebat',
          finaleLeGallId: 'finale-le-gall',
          statut: 'terminee',
        }),
      );
    });

    it('mappe finaleCardebatId/finaleLeGallId à null tant que les finales ne sont pas déterminées', async () => {
      const phaseFinale = buildPhaseFinale();
      prisma.phaseFinale.upsert.mockResolvedValue(buildPhaseFinaleRow());

      await repository.save(phaseFinale);

      const { create } = prisma.phaseFinale.upsert.mock.calls[0][0];
      expect(create.finaleCardebatId).toBeNull();
      expect(create.finaleLeGallId).toBeNull();
    });
  });
});
