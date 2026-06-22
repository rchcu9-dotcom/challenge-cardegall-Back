import { BadRequestException, ConflictException } from '@nestjs/common';
import { CalculerPlanningProvisoireUseCase } from './calculer-planning-provisoire.use-case';
import { Equipe } from '../../../domain/equipe/entities/equipe.entity';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import { Match } from '../../../domain/match/entities/match.entity';
import type { MatchRepository } from '../../../domain/match/repositories/match.repository.interface';
import type { ClockPort } from '../../../domain/shared/ports/clock.port';
import { Tour } from '../../../domain/tour/entities/tour.entity';
import type { TourRepository } from '../../../domain/tour/repositories/tour.repository.interface';
import { PARAMETRES_PREMIER_TOUR, PremierTourService } from '../../../domain/tour/services/premier-tour.service';

function buildEquipe(overrides: Partial<Equipe> = {}): Equipe {
  return {
    id: 'equipe-1',
    nom: 'DSI',
    capitaineUserId: 'demo-dsi',
    nbJoueursApprox: 10,
    nbFemininesEnvisage: 3,
    statut: 'enrolee',
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
    parametres: PARAMETRES_PREMIER_TOUR,
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

describe('CalculerPlanningProvisoireUseCase', () => {
  let equipes: jest.Mocked<EquipeRepository>;
  let tourRepository: jest.Mocked<TourRepository>;
  let matchRepository: jest.Mocked<MatchRepository>;
  let clock: jest.Mocked<ClockPort>;
  let premierTourService: jest.Mocked<PremierTourService>;
  let useCase: CalculerPlanningProvisoireUseCase;

  beforeEach(() => {
    equipes = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(async (entity) => entity),
      findEnroleesOrdered: jest.fn().mockResolvedValue([]),
      reorder: jest.fn(),
    };
    tourRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(async (entity) => entity),
      findCurrent: jest.fn(),
      findLast: jest.fn().mockResolvedValue(null),
      deleteById: jest.fn(),
    };
    matchRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(async (entity) => entity),
      findByTour: jest.fn(),
      saveMany: jest.fn(async (matches) => matches),
      deleteByTour: jest.fn(),
    };
    clock = { now: jest.fn(() => new Date('2026-06-13T08:00:00.000Z')) };
    premierTourService = {
      construire: jest.fn().mockReturnValue({ tour: buildTour(), matches: [] }),
    } as unknown as jest.Mocked<PremierTourService>;

    useCase = new CalculerPlanningProvisoireUseCase(
      equipes,
      tourRepository,
      matchRepository,
      clock,
      premierTourService,
    );
  });

  it('lève ConflictException (409) si un Tour n°1 existe déjà, sans toucher aux équipes ni aux matchs', async () => {
    tourRepository.findLast.mockResolvedValue(buildTour());

    await expect(useCase.execute()).rejects.toThrow(ConflictException);
    expect(equipes.findEnroleesOrdered).not.toHaveBeenCalled();
    expect(premierTourService.construire).not.toHaveBeenCalled();
    expect(tourRepository.save).not.toHaveBeenCalled();
    expect(matchRepository.saveMany).not.toHaveBeenCalled();
  });

  it('lève BadRequestException (400) si moins de 2 équipes sont enrôlées', async () => {
    tourRepository.findLast.mockResolvedValue(null);
    equipes.findEnroleesOrdered.mockResolvedValue([buildEquipe()]);

    await expect(useCase.execute()).rejects.toThrow(BadRequestException);
    expect(premierTourService.construire).not.toHaveBeenCalled();
    expect(tourRepository.save).not.toHaveBeenCalled();
  });

  it('ne bascule jamais les équipes vers "engagee"', async () => {
    tourRepository.findLast.mockResolvedValue(null);
    equipes.findEnroleesOrdered.mockResolvedValue([
      buildEquipe({ id: 'equipe-1' }),
      buildEquipe({ id: 'equipe-2' }),
    ]);

    await useCase.execute();

    expect(equipes.save).not.toHaveBeenCalled();
  });

  it('délègue la construction du Tour n°1 à PremierTourService avec les équipes enrôlées, les paramètres par défaut et l’horloge courante', async () => {
    tourRepository.findLast.mockResolvedValue(null);
    const enrolees = [buildEquipe({ id: 'equipe-1' }), buildEquipe({ id: 'equipe-2' })];
    equipes.findEnroleesOrdered.mockResolvedValue(enrolees);

    await useCase.execute();

    expect(premierTourService.construire).toHaveBeenCalledWith({
      equipesEngagees: enrolees,
      parametres: PARAMETRES_PREMIER_TOUR,
      maintenant: clock.now(),
    });
  });

  it('persiste le Tour et les matchs retournés par PremierTourService, et retourne le Tour créé', async () => {
    tourRepository.findLast.mockResolvedValue(null);
    equipes.findEnroleesOrdered.mockResolvedValue([
      buildEquipe({ id: 'equipe-1' }),
      buildEquipe({ id: 'equipe-2' }),
    ]);
    const tourConstruit = buildTour({ id: 'tour-provisoire' });
    const matchConstruit = buildMatch({ tourId: 'tour-provisoire' });
    premierTourService.construire.mockReturnValue({
      tour: tourConstruit,
      matches: [matchConstruit],
    });

    const result = await useCase.execute();

    expect(tourRepository.save).toHaveBeenCalledWith(tourConstruit);
    expect(matchRepository.saveMany).toHaveBeenCalledWith([matchConstruit]);
    expect(result).toBe(tourConstruit);
  });
});
