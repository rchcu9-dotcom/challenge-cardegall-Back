import { ObtenirPhaseFinaleUseCase } from './obtenir-phase-finale.use-case';
import type { MatchFinaleRepository } from '../../../domain/finale/repositories/match-finale.repository.interface';
import type { PhaseFinaleRepository } from '../../../domain/finale/repositories/phase-finale.repository.interface';
import { MatchFinale } from '../../../domain/finale/entities/match-finale.entity';
import { PhaseFinale } from '../../../domain/finale/entities/phase-finale.entity';

function buildMatchFinale(overrides: Partial<MatchFinale> = {}): MatchFinale {
  return {
    id: 'match-1',
    type: 'demi_finale_a',
    equipeAId: 'equipe-1',
    equipeBId: 'equipe-4',
    scoreA: null,
    scoreB: null,
    statut: 'a_jouer',
    ...overrides,
  };
}

function buildPhaseFinale(overrides: Partial<PhaseFinale> = {}): PhaseFinale {
  return {
    id: 'phase-1',
    demiFinaleAId: 'demi-a',
    demiFinaleBId: 'demi-b',
    finaleCardebatId: null,
    finaleLeGallId: null,
    statut: 'en_cours',
    ...overrides,
  };
}

describe('ObtenirPhaseFinaleUseCase', () => {
  let phaseFinaleRepository: jest.Mocked<PhaseFinaleRepository>;
  let matchFinaleRepository: jest.Mocked<MatchFinaleRepository>;
  let useCase: ObtenirPhaseFinaleUseCase;

  beforeEach(() => {
    phaseFinaleRepository = {
      obtenir: jest.fn(),
      save: jest.fn(),
    };
    matchFinaleRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    };

    useCase = new ObtenirPhaseFinaleUseCase(phaseFinaleRepository, matchFinaleRepository);
  });

  it('retourne demarree: false et tous les champs à null si la phase finale n\'a pas été démarrée', async () => {
    phaseFinaleRepository.obtenir.mockResolvedValue(null);

    const result = await useCase.execute();

    expect(result).toEqual({
      demarree: false,
      statut: null,
      demiFinaleA: null,
      demiFinaleB: null,
      finaleCardebat: null,
      finaleLeGall: null,
    });
    expect(matchFinaleRepository.findById).not.toHaveBeenCalled();
  });

  it('retourne demarree: true avec les demi-finales chargées et les finales à null tant que les ids ne sont pas renseignés', async () => {
    const phaseFinale = buildPhaseFinale();
    const demiFinaleA = buildMatchFinale({ id: 'demi-a', type: 'demi_finale_a' });
    const demiFinaleB = buildMatchFinale({ id: 'demi-b', type: 'demi_finale_b' });

    phaseFinaleRepository.obtenir.mockResolvedValue(phaseFinale);
    matchFinaleRepository.findById.mockImplementation(async (id: string) => {
      if (id === 'demi-a') return demiFinaleA;
      if (id === 'demi-b') return demiFinaleB;
      return null;
    });

    const result = await useCase.execute();

    expect(result).toEqual({
      demarree: true,
      statut: 'en_cours',
      demiFinaleA: { ...demiFinaleA },
      demiFinaleB: { ...demiFinaleB },
      finaleCardebat: null,
      finaleLeGall: null,
    });
    // Pas d'appel findById pour des ids null
    expect(matchFinaleRepository.findById).toHaveBeenCalledTimes(2);
  });

  it('retourne demarree: true avec les 4 matchs chargés une fois les finales déterminées', async () => {
    const phaseFinale = buildPhaseFinale({
      finaleCardebatId: 'finale-cardebat',
      finaleLeGallId: 'finale-le-gall',
      statut: 'terminee',
    });
    const matches: Record<string, MatchFinale> = {
      'demi-a': buildMatchFinale({ id: 'demi-a', type: 'demi_finale_a', statut: 'termine' }),
      'demi-b': buildMatchFinale({ id: 'demi-b', type: 'demi_finale_b', statut: 'termine' }),
      'finale-cardebat': buildMatchFinale({ id: 'finale-cardebat', type: 'finale_cardebat', statut: 'termine' }),
      'finale-le-gall': buildMatchFinale({ id: 'finale-le-gall', type: 'finale_le_gall', statut: 'termine' }),
    };

    phaseFinaleRepository.obtenir.mockResolvedValue(phaseFinale);
    matchFinaleRepository.findById.mockImplementation(async (id: string) => matches[id] ?? null);

    const result = await useCase.execute();

    expect(result.demarree).toBe(true);
    expect(result.statut).toBe('terminee');
    expect(result.demiFinaleA).toEqual({ ...matches['demi-a'] });
    expect(result.demiFinaleB).toEqual({ ...matches['demi-b'] });
    expect(result.finaleCardebat).toEqual({ ...matches['finale-cardebat'] });
    expect(result.finaleLeGall).toEqual({ ...matches['finale-le-gall'] });
    expect(matchFinaleRepository.findById).toHaveBeenCalledTimes(4);
  });
});
