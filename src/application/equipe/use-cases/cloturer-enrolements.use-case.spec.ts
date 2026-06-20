import { BadRequestException, ConflictException } from '@nestjs/common';
import { CloturerEnrolementsUseCase } from './cloturer-enrolements.use-case';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import type { EnrolementStateRepository } from '../../../domain/equipe/repositories/enrolement-state.repository.interface';
import type { AppariementService } from '../../../domain/tour/services/appariement.service';
import type { PlanningService } from '../../../domain/planning/services/planning.service';
import type { TourRepository } from '../../../domain/tour/repositories/tour.repository.interface';
import type { MatchRepository } from '../../../domain/match/repositories/match.repository.interface';
import type { ClockPort } from '../../../domain/shared/ports/clock.port';
import { Equipe } from '../../../domain/equipe/entities/equipe.entity';
import { Match } from '../../../domain/match/entities/match.entity';

function buildEquipe(overrides: Partial<Equipe> = {}): Equipe {
  return {
    id: 'equipe-1',
    nom: 'DSI',
    capitaineUserId: 'demo-dsi',
    nbJoueursApprox: 10,
    nbFemininesEnvisage: 3,
    statut: 'enrolee',
    nbFemininesReel: 3,
    dateInscription: '2026-06-13T00:00:00.000Z',
    dateEnrolement: '2026-06-13T08:00:00.000Z',
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

describe('CloturerEnrolementsUseCase', () => {
  let equipes: jest.Mocked<EquipeRepository>;
  let enrolementState: jest.Mocked<EnrolementStateRepository>;
  let appariementService: jest.Mocked<AppariementService>;
  let planningService: jest.Mocked<PlanningService>;
  let tourRepository: jest.Mocked<TourRepository>;
  let matchRepository: jest.Mocked<MatchRepository>;
  let clock: jest.Mocked<ClockPort>;
  let useCase: CloturerEnrolementsUseCase;

  beforeEach(() => {
    equipes = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(async (entity) => entity),
      findEnroleesOrdered: jest.fn(),
      reorder: jest.fn(),
    };
    enrolementState = {
      isCloture: jest.fn().mockResolvedValue(false),
      cloturer: jest.fn().mockResolvedValue(undefined),
    };
    appariementService = {
      genererAppariements: jest.fn().mockReturnValue({ paires: [], becotEquipeId: null }),
    };
    planningService = {
      calculerHoraires: jest.fn().mockReturnValue([]),
    };
    tourRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(async (entity) => entity),
      findCurrent: jest.fn(),
      findLast: jest.fn(),
    };
    matchRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(async (entity) => entity),
      findByTour: jest.fn(),
      saveMany: jest.fn(async (matches) => matches),
    };
    clock = { now: jest.fn(() => new Date('2026-06-13T08:00:00.000Z')) };

    useCase = new CloturerEnrolementsUseCase(
      equipes,
      enrolementState,
      appariementService,
      planningService,
      tourRepository,
      matchRepository,
      clock,
    );
  });

  it('lève ConflictException si les enrôlements sont déjà clôturés', async () => {
    enrolementState.isCloture.mockResolvedValue(true);

    await expect(useCase.execute()).rejects.toThrow(ConflictException);
    expect(equipes.save).not.toHaveBeenCalled();
    expect(enrolementState.cloturer).not.toHaveBeenCalled();
  });

  it('lève BadRequestException si moins de 2 équipes sont enrôlées', async () => {
    equipes.findEnroleesOrdered.mockResolvedValue([buildEquipe()]);

    await expect(useCase.execute()).rejects.toThrow(BadRequestException);
    expect(equipes.save).not.toHaveBeenCalled();
    expect(enrolementState.cloturer).not.toHaveBeenCalled();
  });

  it('passe toutes les équipes enrôlées à "engagee" et clôture les enrôlements', async () => {
    equipes.findEnroleesOrdered.mockResolvedValue([
      buildEquipe({ id: 'equipe-1' }),
      buildEquipe({ id: 'equipe-2' }),
    ]);

    const result = await useCase.execute();

    expect(result.cloture).toBe(true);
    expect(result.equipes).toHaveLength(2);
    expect(result.equipes.every((equipe) => equipe.statut === 'engagee')).toBe(true);
    expect(equipes.save).toHaveBeenCalledTimes(2);
    expect(enrolementState.cloturer).toHaveBeenCalledTimes(1);
  });

  it('cas nominal avec 2 équipes : génère le classement initial neutre, sauvegarde le tour 1 et les matchs planifiés', async () => {
    equipes.findEnroleesOrdered.mockResolvedValue([
      buildEquipe({ id: 'equipe-1' }),
      buildEquipe({ id: 'equipe-2' }),
    ]);

    appariementService.genererAppariements.mockReturnValue({
      paires: [['equipe-1', 'equipe-2']],
      becotEquipeId: null,
    });

    const matchPlanifie = buildMatch({
      id: 'match-planifie-1',
      equipeAId: 'equipe-1',
      equipeBId: 'equipe-2',
    });
    planningService.calculerHoraires.mockReturnValue([matchPlanifie]);

    await useCase.execute();

    expect(appariementService.genererAppariements).toHaveBeenCalledWith(
      [
        expect.objectContaining({ equipeId: 'equipe-1', points: 0, rang: 1 }),
        expect.objectContaining({ equipeId: 'equipe-2', points: 0, rang: 2 }),
      ],
      [],
      [],
    );

    expect(planningService.calculerHoraires).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          equipeAId: 'equipe-1',
          equipeBId: 'equipe-2',
          estBye: false,
          statut: 'a_jouer',
        }),
      ],
      { nomsTerrains: ['A', 'B'], dureeMatchMinutes: 10, latenceMinutes: 2, delaiDemarrageMinutes: 3 },
      clock.now(),
    );

    expect(tourRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        numero: 1,
        statut: 'en_cours',
        parametres: {
          nomsTerrains: ['A', 'B'],
          dureeMatchMinutes: 10,
          latenceMinutes: 2,
          delaiDemarrageMinutes: 3,
        },
        equipesBecot: [],
      }),
    );

    expect(matchRepository.saveMany).toHaveBeenCalledWith([matchPlanifie]);
  });

  it('cas avec nombre impair d\'équipes : ajoute un match bye et enregistre le becotEquipeId sur le tour', async () => {
    equipes.findEnroleesOrdered.mockResolvedValue([
      buildEquipe({ id: 'equipe-1' }),
      buildEquipe({ id: 'equipe-2' }),
      buildEquipe({ id: 'equipe-3' }),
    ]);

    appariementService.genererAppariements.mockReturnValue({
      paires: [['equipe-1', 'equipe-2']],
      becotEquipeId: 'equipe-3',
    });

    const matchPlanifie = buildMatch({
      id: 'match-planifie-1',
      equipeAId: 'equipe-1',
      equipeBId: 'equipe-2',
    });
    planningService.calculerHoraires.mockReturnValue([matchPlanifie]);

    await useCase.execute();

    expect(matchRepository.saveMany).toHaveBeenCalledWith([
      matchPlanifie,
      expect.objectContaining({
        equipeAId: 'equipe-3',
        equipeBId: null,
        estBye: true,
        statut: 'termine',
      }),
    ]);

    expect(tourRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        equipesBecot: ['equipe-3'],
      }),
    );
  });
});
