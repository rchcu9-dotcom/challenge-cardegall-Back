import { CycleTournoiPrismaRepository } from './cycle-tournoi.prisma.repository';
import type { ClassementEntry } from '../../../domain/classement/entities/classement-entry.entity';
import type { PrismaService } from './prisma.service';

function buildClassement(): ClassementEntry[] {
  return [
    {
      equipeId: 'equipe-1',
      points: 9,
      victoires: 3,
      nuls: 0,
      defaites: 0,
      butsMarques: 12,
      butsConcedes: 3,
      diffGenerale: 9,
      diffParticuliere: 9,
      nbFeminines: 4,
      rang: 1,
    },
  ];
}

describe('CycleTournoiPrismaRepository', () => {
  let prisma: { tournoiEtat: Record<string, jest.Mock> };
  let repository: CycleTournoiPrismaRepository;

  beforeEach(() => {
    prisma = {
      tournoiEtat: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    repository = new CycleTournoiPrismaRepository(prisma as unknown as PrismaService);
  });

  describe('estPhaseFinaleDeclenchee', () => {
    it('lit la ligne id=1 et retourne phaseFinaleDeclenchee', async () => {
      prisma.tournoiEtat.findUnique.mockResolvedValue({
        id: 1,
        enrolementsClotures: false,
        phaseFinaleDeclenchee: true,
        classementFinalPoules: null,
      });

      const result = await repository.estPhaseFinaleDeclenchee();

      expect(prisma.tournoiEtat.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toBe(true);
    });

    it('retourne false si aucune ligne n\'existe encore', async () => {
      prisma.tournoiEtat.findUnique.mockResolvedValue(null);

      const result = await repository.estPhaseFinaleDeclenchee();

      expect(result).toBe(false);
    });
  });

  describe('declencherPhaseFinale', () => {
    it('upsert la ligne id=1 avec phaseFinaleDeclenchee: true et le classement figé', async () => {
      const classement = buildClassement();
      prisma.tournoiEtat.upsert.mockResolvedValue({});

      await repository.declencherPhaseFinale(classement);

      expect(prisma.tournoiEtat.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        create: {
          id: 1,
          phaseFinaleDeclenchee: true,
          classementFinalPoules: classement,
        },
        update: {
          phaseFinaleDeclenchee: true,
          classementFinalPoules: classement,
        },
      });
    });
  });

  describe('obtenirClassementFinalPoules', () => {
    it('retourne le classement désérialisé depuis la colonne JSON', async () => {
      const classement = buildClassement();
      prisma.tournoiEtat.findUnique.mockResolvedValue({
        id: 1,
        enrolementsClotures: false,
        phaseFinaleDeclenchee: true,
        classementFinalPoules: classement,
      });

      const result = await repository.obtenirClassementFinalPoules();

      expect(result).toEqual(classement);
    });

    it('retourne null si la colonne JSON est null', async () => {
      prisma.tournoiEtat.findUnique.mockResolvedValue({
        id: 1,
        enrolementsClotures: false,
        phaseFinaleDeclenchee: false,
        classementFinalPoules: null,
      });

      const result = await repository.obtenirClassementFinalPoules();

      expect(result).toBeNull();
    });

    it('retourne null si aucune ligne n\'existe encore', async () => {
      prisma.tournoiEtat.findUnique.mockResolvedValue(null);

      const result = await repository.obtenirClassementFinalPoules();

      expect(result).toBeNull();
    });
  });
});
