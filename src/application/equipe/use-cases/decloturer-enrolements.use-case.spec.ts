import { ConflictException } from '@nestjs/common';
import { DecloturerEnrolementsUseCase } from './decloturer-enrolements.use-case';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import type { EnrolementStateRepository } from '../../../domain/equipe/repositories/enrolement-state.repository.interface';
import type { TourRepository } from '../../../domain/tour/repositories/tour.repository.interface';
import type { MatchRepository } from '../../../domain/match/repositories/match.repository.interface';
import { Equipe } from '../../../domain/equipe/entities/equipe.entity';
import { Match } from '../../../domain/match/entities/match.entity';
import { Tour } from '../../../domain/tour/entities/tour.entity';

function buildEquipe(overrides: Partial<Equipe> = {}): Equipe {
  return {
    id: 'equipe-1',
    nom: 'DSI',
    capitaineUserId: 'demo-dsi',
    nbJoueursApprox: 10,
    nbFemininesEnvisage: 3,
    statut: 'engagee',
    nbFemininesReel: 3,
    dateInscription: '2026-06-13T00:00:00.000Z',
    dateEnrolement: '2026-06-13T08:00:00.000Z',
    ...overrides,
  };
}

function buildTour(overrides: Partial<Tour> = {}): Tour {
  return {
    id: 'tour-1',
    numero: 1,
    statut: 'en_cours',
    parametres: {
      nomsTerrains: ['A', 'B'],
      dureeMatchMinutes: 10,
      latenceMinutes: 2,
      delaiDemarrageMinutes: 3,
    },
    equipesBecot: [],
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
    heureDebutPrevue: '2026-06-13T08:03:00.000Z',
    heureFinPrevue: '2026-06-13T08:13:00.000Z',
    scoreA: null,
    scoreB: null,
    statut: 'a_jouer',
    ...overrides,
  };
}

describe('DecloturerEnrolementsUseCase', () => {
  let equipes: jest.Mocked<EquipeRepository>;
  let enrolementState: jest.Mocked<EnrolementStateRepository>;
  let tourRepository: jest.Mocked<TourRepository>;
  let matchRepository: jest.Mocked<MatchRepository>;
  let useCase: DecloturerEnrolementsUseCase;

  beforeEach(() => {
    equipes = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(async (entity) => entity),
      findEnroleesOrdered: jest.fn(),
      reorder: jest.fn(),
    };
    enrolementState = {
      isCloture: jest.fn().mockResolvedValue(true),
      cloturer: jest.fn().mockResolvedValue(undefined),
      decloturer: jest.fn().mockResolvedValue(undefined),
    };
    tourRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(async (entity) => entity),
      findCurrent: jest.fn(),
      findLast: jest.fn().mockResolvedValue(buildTour()),
      deleteById: jest.fn().mockResolvedValue(undefined),
    };
    matchRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(async (entity) => entity),
      findByTour: jest.fn().mockResolvedValue([]),
      saveMany: jest.fn(async (matches) => matches),
      deleteByTour: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new DecloturerEnrolementsUseCase(
      equipes,
      enrolementState,
      tourRepository,
      matchRepository,
    );
  });

  it('lève ConflictException si les enrôlements ne sont pas clôturés', async () => {
    enrolementState.isCloture.mockResolvedValue(false);

    await expect(useCase.execute()).rejects.toThrow(ConflictException);
    expect(tourRepository.findLast).not.toHaveBeenCalled();
    expect(enrolementState.decloturer).not.toHaveBeenCalled();
  });

  it('lève ConflictException si un Tour n°2 existe déjà (numero !== 1)', async () => {
    tourRepository.findLast.mockResolvedValue(buildTour({ numero: 2 }));

    await expect(useCase.execute()).rejects.toThrow(ConflictException);
    expect(matchRepository.findByTour).not.toHaveBeenCalled();
    expect(enrolementState.decloturer).not.toHaveBeenCalled();
  });

  it('lève ConflictException si le Tour n°1 est déjà "termine" (phase finale ou tour suivant déclenchés)', async () => {
    tourRepository.findLast.mockResolvedValue(buildTour({ statut: 'termine' }));

    await expect(useCase.execute()).rejects.toThrow(ConflictException);
    expect(enrolementState.decloturer).not.toHaveBeenCalled();
  });

  it('lève ConflictException si aucun tour n\'existe', async () => {
    tourRepository.findLast.mockResolvedValue(null);

    await expect(useCase.execute()).rejects.toThrow(ConflictException);
    expect(enrolementState.decloturer).not.toHaveBeenCalled();
  });

  it('lève ConflictException si un match non-bye du Tour n°1 a un score saisi', async () => {
    matchRepository.findByTour.mockResolvedValue([buildMatch({ scoreA: 3, scoreB: 1 })]);

    await expect(useCase.execute()).rejects.toThrow(ConflictException);
    expect(equipes.save).not.toHaveBeenCalled();
    expect(matchRepository.deleteByTour).not.toHaveBeenCalled();
    expect(tourRepository.deleteById).not.toHaveBeenCalled();
    expect(enrolementState.decloturer).not.toHaveBeenCalled();
  });

  it('lève ConflictException si seul scoreB est saisi (scoreA encore null)', async () => {
    matchRepository.findByTour.mockResolvedValue([buildMatch({ scoreA: null, scoreB: 0 })]);

    await expect(useCase.execute()).rejects.toThrow(ConflictException);
    expect(enrolementState.decloturer).not.toHaveBeenCalled();
  });

  it('autorise la décloture si seul le match Becot/bye est "termine" (pas un résultat saisi)', async () => {
    matchRepository.findByTour.mockResolvedValue([
      buildMatch({ id: 'match-becot', estBye: true, equipeBId: null, statut: 'termine' }),
    ]);
    equipes.findAll.mockResolvedValue([buildEquipe()]);

    const result = await useCase.execute();

    expect(result.cloture).toBe(false);
  });

  it('repasse les équipes "engagee" en "enrolee", supprime le tour et ses matchs, et décloture', async () => {
    equipes.findAll.mockResolvedValue([
      buildEquipe({ id: 'equipe-1', statut: 'engagee' }),
      buildEquipe({ id: 'equipe-2', statut: 'engagee' }),
      buildEquipe({ id: 'equipe-3', statut: 'retiree' }),
    ]);

    const result = await useCase.execute();

    expect(equipes.save).toHaveBeenCalledTimes(2);
    expect(equipes.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'equipe-1', statut: 'enrolee' }));
    expect(equipes.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'equipe-2', statut: 'enrolee' }));

    expect(matchRepository.deleteByTour).toHaveBeenCalledWith('tour-1');
    expect(tourRepository.deleteById).toHaveBeenCalledWith('tour-1');
    expect(enrolementState.decloturer).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      equipes: [
        expect.objectContaining({ id: 'equipe-1', statut: 'enrolee' }),
        expect.objectContaining({ id: 'equipe-2', statut: 'enrolee' }),
      ],
      cloture: false,
    });
  });

  it('supprime les matchs avant le tour (ordre imposé par la contrainte FK Match.tourId)', async () => {
    const ordreAppels: string[] = [];
    matchRepository.deleteByTour.mockImplementation(async () => {
      ordreAppels.push('deleteByTour');
    });
    tourRepository.deleteById.mockImplementation(async () => {
      ordreAppels.push('deleteById');
    });
    equipes.findAll.mockResolvedValue([]);

    await useCase.execute();

    expect(ordreAppels).toEqual(['deleteByTour', 'deleteById']);
  });
});
