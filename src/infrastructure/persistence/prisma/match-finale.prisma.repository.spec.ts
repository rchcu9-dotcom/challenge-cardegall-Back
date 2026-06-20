import { MatchFinalePrismaRepository } from './match-finale.prisma.repository';
import type { MatchFinale } from '../../../domain/finale/entities/match-finale.entity';
import type { PrismaService } from './prisma.service';

function buildMatchFinaleRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'match-finale-1',
    type: 'demi_finale_a',
    equipeAId: 'equipe-1',
    equipeBId: 'equipe-4',
    scoreA: null,
    scoreB: null,
    statut: 'a_jouer',
    ...overrides,
  };
}

function buildMatchFinale(overrides: Partial<MatchFinale> = {}): MatchFinale {
  return {
    id: 'match-finale-1',
    type: 'demi_finale_a',
    equipeAId: 'equipe-1',
    equipeBId: 'equipe-4',
    scoreA: null,
    scoreB: null,
    statut: 'a_jouer',
    ...overrides,
  };
}

describe('MatchFinalePrismaRepository', () => {
  let prisma: { matchFinale: Record<string, jest.Mock> };
  let repository: MatchFinalePrismaRepository;

  beforeEach(() => {
    prisma = {
      matchFinale: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    repository = new MatchFinalePrismaRepository(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('appelle prisma.matchFinale.findMany() et mappe les lignes vers le domain', async () => {
      prisma.matchFinale.findMany.mockResolvedValue([buildMatchFinaleRow()]);

      const result = await repository.findAll();

      expect(prisma.matchFinale.findMany).toHaveBeenCalledWith();
      expect(result).toEqual([buildMatchFinale()]);
    });
  });

  describe('findById', () => {
    it('appelle prisma.matchFinale.findUnique({ where: { id } }) et mappe la ligne', async () => {
      prisma.matchFinale.findUnique.mockResolvedValue(buildMatchFinaleRow());

      const result = await repository.findById('match-finale-1');

      expect(prisma.matchFinale.findUnique).toHaveBeenCalledWith({ where: { id: 'match-finale-1' } });
      expect(result).toEqual(buildMatchFinale());
    });

    it('retourne null si la ligne est introuvable', async () => {
      prisma.matchFinale.findUnique.mockResolvedValue(null);

      const result = await repository.findById('inconnu');

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('upsert le match finale avec id et mappe le résultat', async () => {
      const match = buildMatchFinale({ scoreA: 4, scoreB: 2, statut: 'termine' });
      prisma.matchFinale.upsert.mockResolvedValue(
        buildMatchFinaleRow({ scoreA: 4, scoreB: 2, statut: 'termine' }),
      );

      const result = await repository.save(match);

      expect(prisma.matchFinale.upsert).toHaveBeenCalledWith({
        where: { id: match.id },
        create: expect.objectContaining({ id: match.id, scoreA: 4, scoreB: 2, statut: 'termine' }),
        update: expect.objectContaining({ scoreA: 4, scoreB: 2, statut: 'termine' }),
      });
      expect(result).toEqual(buildMatchFinale({ scoreA: 4, scoreB: 2, statut: 'termine' }));
    });

    it('gère le cas où les équipes ne sont pas encore déterminées (finales)', async () => {
      const match = buildMatchFinale({
        id: 'finale-cardebat',
        type: 'finale_cardebat',
        equipeAId: null,
        equipeBId: null,
      });
      prisma.matchFinale.upsert.mockResolvedValue(
        buildMatchFinaleRow({ id: 'finale-cardebat', type: 'finale_cardebat', equipeAId: null, equipeBId: null }),
      );

      const result = await repository.save(match);

      expect(prisma.matchFinale.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ equipeAId: null, equipeBId: null, type: 'finale_cardebat' }),
        }),
      );
      expect(result.equipeAId).toBeNull();
      expect(result.equipeBId).toBeNull();
    });
  });
});
