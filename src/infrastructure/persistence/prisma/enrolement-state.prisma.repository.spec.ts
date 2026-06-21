import { EnrolementStatePrismaRepository } from './enrolement-state.prisma.repository';
import type { PrismaService } from './prisma.service';

describe('EnrolementStatePrismaRepository', () => {
  let prisma: { tournoiEtat: Record<string, jest.Mock> };
  let repository: EnrolementStatePrismaRepository;

  beforeEach(() => {
    prisma = {
      tournoiEtat: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };
    repository = new EnrolementStatePrismaRepository(prisma as unknown as PrismaService);
  });

  describe('isCloture', () => {
    it('lit la ligne id=1 et retourne enrolementsClotures', async () => {
      prisma.tournoiEtat.findUnique.mockResolvedValue({
        id: 1,
        enrolementsClotures: true,
        phaseFinaleDeclenchee: false,
        classementFinalPoules: null,
      });

      const result = await repository.isCloture();

      expect(prisma.tournoiEtat.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toBe(true);
    });

    it('retourne false si aucune ligne n\'existe encore', async () => {
      prisma.tournoiEtat.findUnique.mockResolvedValue(null);

      const result = await repository.isCloture();

      expect(result).toBe(false);
    });
  });

  describe('cloturer', () => {
    it('upsert la ligne id=1 avec enrolementsClotures: true (create et update)', async () => {
      prisma.tournoiEtat.upsert.mockResolvedValue({});

      await repository.cloturer();

      expect(prisma.tournoiEtat.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        create: { id: 1, enrolementsClotures: true },
        update: { enrolementsClotures: true },
      });
    });
  });

  describe('decloturer', () => {
    it('met à jour la ligne id=1 avec enrolementsClotures: false', async () => {
      prisma.tournoiEtat.update.mockResolvedValue({});

      await repository.decloturer();

      expect(prisma.tournoiEtat.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { enrolementsClotures: false },
      });
    });
  });
});
