import { BadRequestException, ConflictException } from '@nestjs/common';
import { CloturerEnrolementsUseCase } from './cloturer-enrolements.use-case';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import type { EnrolementStateRepository } from '../../../domain/equipe/repositories/enrolement-state.repository.interface';
import type { MatchRepository } from '../../../domain/match/repositories/match.repository.interface';
import type { ClockPort } from '../../../domain/shared/ports/clock.port';
import type { TourRepository } from '../../../domain/tour/repositories/tour.repository.interface';
import { PARAMETRES_PREMIER_TOUR, PremierTourService } from '../../../domain/tour/services/premier-tour.service';
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
    statut: 'enrolee',
    nbFemininesReel: 3,
    dateInscription: '2026-06-13T00:00:00.000Z',
    dateEnrolement: '2026-06-13T08:00:00.000Z',
    ...overrides,
  };
}

function buildTour(overrides: Partial<Tour> = {}): Tour {
  return {
    id: 'tour-existant',
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

describe('CloturerEnrolementsUseCase', () => {
  let equipes: jest.Mocked<EquipeRepository>;
  let enrolementState: jest.Mocked<EnrolementStateRepository>;
  let tourRepository: jest.Mocked<TourRepository>;
  let matchRepository: jest.Mocked<MatchRepository>;
  let clock: jest.Mocked<ClockPort>;
  let premierTourService: jest.Mocked<PremierTourService>;
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
      construire: jest.fn().mockReturnValue({ tour: buildTour({ id: 'tour-1' }), matches: [] }),
    } as unknown as jest.Mocked<PremierTourService>;

    useCase = new CloturerEnrolementsUseCase(
      equipes,
      enrolementState,
      tourRepository,
      matchRepository,
      clock,
      premierTourService,
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

  describe('quand aucun Tour n’existe encore (chemin classique)', () => {
    beforeEach(() => {
      tourRepository.findLast.mockResolvedValue(null);
    });

    it('délègue la construction du Tour n°1 à PremierTourService avec les équipes engagées, les paramètres par défaut et l’horloge courante', async () => {
      const enrolees = [buildEquipe({ id: 'equipe-1' }), buildEquipe({ id: 'equipe-2' })];
      equipes.findEnroleesOrdered.mockResolvedValue(enrolees);

      await useCase.execute();

      expect(premierTourService.construire).toHaveBeenCalledWith({
        equipesEngagees: [
          expect.objectContaining({ id: 'equipe-1', statut: 'engagee' }),
          expect.objectContaining({ id: 'equipe-2', statut: 'engagee' }),
        ],
        parametres: PARAMETRES_PREMIER_TOUR,
        maintenant: clock.now(),
      });
    });

    it('persiste le Tour et les matchs retournés par PremierTourService', async () => {
      equipes.findEnroleesOrdered.mockResolvedValue([
        buildEquipe({ id: 'equipe-1' }),
        buildEquipe({ id: 'equipe-2' }),
      ]);
      const tourConstruit = buildTour({ id: 'tour-nouveau' });
      const matchConstruit = buildMatch({ tourId: 'tour-nouveau' });
      premierTourService.construire.mockReturnValue({
        tour: tourConstruit,
        matches: [matchConstruit],
      });

      await useCase.execute();

      expect(tourRepository.save).toHaveBeenCalledWith(tourConstruit);
      expect(matchRepository.saveMany).toHaveBeenCalledWith([matchConstruit]);
    });
  });

  describe('quand un Tour n°1 existe déjà (créé via planning provisoire)', () => {
    beforeEach(() => {
      tourRepository.findLast.mockResolvedValue(buildTour({ id: 'tour-provisoire' }));
    });

    it('ne reconstruit pas l’appariement/planning : PremierTourService n’est pas appelé', async () => {
      equipes.findEnroleesOrdered.mockResolvedValue([
        buildEquipe({ id: 'equipe-1' }),
        buildEquipe({ id: 'equipe-2' }),
      ]);

      await useCase.execute();

      expect(premierTourService.construire).not.toHaveBeenCalled();
      expect(tourRepository.save).not.toHaveBeenCalled();
      expect(matchRepository.saveMany).not.toHaveBeenCalled();
    });

    it('se limite à verrouiller l’effectif (engagee + enrolementsClotures) sans toucher aux matchs déjà planifiés', async () => {
      equipes.findEnroleesOrdered.mockResolvedValue([
        buildEquipe({ id: 'equipe-1' }),
        buildEquipe({ id: 'equipe-2' }),
      ]);

      const result = await useCase.execute();

      expect(result.cloture).toBe(true);
      expect(result.equipes.every((equipe) => equipe.statut === 'engagee')).toBe(true);
      expect(enrolementState.cloturer).toHaveBeenCalledTimes(1);
    });
  });
});
