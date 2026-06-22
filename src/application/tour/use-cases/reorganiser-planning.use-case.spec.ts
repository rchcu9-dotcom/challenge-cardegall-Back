import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ReorganiserPlanningUseCase } from './reorganiser-planning.use-case';
import { ObtenirTourCourantUseCase } from './obtenir-tour-courant.use-case';
import type { MatchRepository } from '../../../domain/match/repositories/match.repository.interface';
import type { TourRepository } from '../../../domain/tour/repositories/tour.repository.interface';
import type { PlanningService } from '../../../domain/planning/services/planning.service';
import type { ClockPort } from '../../../domain/shared/ports/clock.port';
import { Match } from '../../../domain/match/entities/match.entity';
import { Tour } from '../../../domain/tour/entities/tour.entity';
import { TourCourantDto } from '../dto/tour-courant.dto';
import { TerrainPlanningDto } from '../dto/reorganiser-planning.dto';

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
    terrain: null,
    heureDebutPrevue: null,
    heureFinPrevue: null,
    scoreA: null,
    scoreB: null,
    statut: 'a_jouer',
    ...overrides,
  };
}

const TOUR_COURANT_DTO_PLACEHOLDER: TourCourantDto = {
  tour: buildTour(),
  matches: [],
  classement: [],
  resultatsComplets: false,
};

const MAINTENANT = new Date('2026-06-21T08:00:00.000Z');

describe('ReorganiserPlanningUseCase', () => {
  let tourRepository: jest.Mocked<TourRepository>;
  let matchRepository: jest.Mocked<MatchRepository>;
  let planningService: jest.Mocked<PlanningService>;
  let clock: jest.Mocked<ClockPort>;
  let obtenirTourCourantUseCase: jest.Mocked<ObtenirTourCourantUseCase>;
  let useCase: ReorganiserPlanningUseCase;

  beforeEach(() => {
    tourRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      findCurrent: jest.fn(),
      findLast: jest.fn(),
      deleteById: jest.fn(),
    };
    matchRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      findByTour: jest.fn(),
      saveMany: jest.fn(async (matches: Match[]) => matches),
      deleteByTour: jest.fn(),
    };
    planningService = {
      calculerHoraires: jest.fn(),
      recalculerHorairesManuel: jest.fn().mockReturnValue([]),
    };
    clock = { now: jest.fn().mockReturnValue(MAINTENANT) };
    obtenirTourCourantUseCase = {
      execute: jest.fn().mockResolvedValue(TOUR_COURANT_DTO_PLACEHOLDER),
    } as unknown as jest.Mocked<ObtenirTourCourantUseCase>;

    useCase = new ReorganiserPlanningUseCase(
      tourRepository,
      matchRepository,
      planningService,
      clock,
      obtenirTourCourantUseCase,
    );
  });

  it("lève NotFoundException si aucun tour n'est en cours", async () => {
    tourRepository.findCurrent.mockResolvedValue(null);

    await expect(useCase.execute([])).rejects.toThrow(NotFoundException);
    expect(matchRepository.saveMany).not.toHaveBeenCalled();
  });

  it("lève ConflictException si le tour courant n'est pas 'en_cours'", async () => {
    tourRepository.findCurrent.mockResolvedValue(buildTour({ statut: 'termine' }));

    await expect(
      useCase.execute([
        { terrain: 'A', matchIds: [] },
        { terrain: 'B', matchIds: [] },
      ]),
    ).rejects.toThrow(ConflictException);
    expect(matchRepository.saveMany).not.toHaveBeenCalled();
  });

  it('lève BadRequestException si les terrains du payload ne correspondent pas exactement à ceux du tour', async () => {
    tourRepository.findCurrent.mockResolvedValue(buildTour());
    matchRepository.findByTour.mockResolvedValue([]);

    await expect(
      useCase.execute([{ terrain: 'A', matchIds: [] }]),
    ).rejects.toThrow(BadRequestException);
    expect(matchRepository.saveMany).not.toHaveBeenCalled();
  });

  it('lève BadRequestException si un terrain du payload est dupliqué', async () => {
    tourRepository.findCurrent.mockResolvedValue(buildTour());
    matchRepository.findByTour.mockResolvedValue([]);

    await expect(
      useCase.execute([
        { terrain: 'A', matchIds: [] },
        { terrain: 'A', matchIds: [] },
      ]),
    ).rejects.toThrow(BadRequestException);
  });

  it("lève BadRequestException si l'union des matchIds omet un match à_jouer du tour courant", async () => {
    const tour = buildTour();
    tourRepository.findCurrent.mockResolvedValue(tour);
    matchRepository.findByTour.mockResolvedValue([
      buildMatch({ id: 'match-1', statut: 'a_jouer' }),
      buildMatch({ id: 'match-2', statut: 'a_jouer' }),
    ]);

    await expect(
      useCase.execute([
        { terrain: 'A', matchIds: ['match-1'] },
        { terrain: 'B', matchIds: [] },
      ]),
    ).rejects.toThrow(BadRequestException);
    expect(matchRepository.saveMany).not.toHaveBeenCalled();
  });

  it('lève BadRequestException si un matchId est dupliqué dans le payload', async () => {
    const tour = buildTour();
    tourRepository.findCurrent.mockResolvedValue(tour);
    matchRepository.findByTour.mockResolvedValue([
      buildMatch({ id: 'match-1', statut: 'a_jouer' }),
      buildMatch({ id: 'match-2', statut: 'a_jouer' }),
    ]);

    await expect(
      useCase.execute([
        { terrain: 'A', matchIds: ['match-1', 'match-1'] },
        { terrain: 'B', matchIds: ['match-2'] },
      ]),
    ).rejects.toThrow(BadRequestException);
  });

  it("lève BadRequestException si le payload inclut un match non éditable (déjà en_cours/termine) ou un id inconnu", async () => {
    const tour = buildTour();
    tourRepository.findCurrent.mockResolvedValue(tour);
    matchRepository.findByTour.mockResolvedValue([
      buildMatch({ id: 'match-1', statut: 'a_jouer' }),
      buildMatch({ id: 'match-fige', statut: 'termine' }),
    ]);

    await expect(
      useCase.execute([
        { terrain: 'A', matchIds: ['match-1', 'match-fige'] },
        { terrain: 'B', matchIds: [] },
      ]),
    ).rejects.toThrow(BadRequestException);
  });

  it('exclut les matchs Becot (estBye) de la validation des matchIds attendus', async () => {
    const tour = buildTour();
    tourRepository.findCurrent.mockResolvedValue(tour);
    matchRepository.findByTour.mockResolvedValue([
      buildMatch({ id: 'match-1', statut: 'a_jouer' }),
      buildMatch({ id: 'match-bye', estBye: true, equipeBId: null, statut: 'termine' }),
    ]);

    await expect(
      useCase.execute([
        { terrain: 'A', matchIds: ['match-1'] },
        { terrain: 'B', matchIds: [] },
      ]),
    ).resolves.toEqual(TOUR_COURANT_DTO_PLACEHOLDER);
  });

  it('calcule, pour chaque terrain, une ancre = heureFinPrevue la plus tardive parmi les matchs figés de ce terrain (null si aucun)', async () => {
    const tour = buildTour();
    tourRepository.findCurrent.mockResolvedValue(tour);
    const figeTot = buildMatch({
      id: 'fige-1',
      terrain: 'A',
      statut: 'en_cours',
      heureFinPrevue: '2026-06-21T08:10:00.000Z',
    });
    const figeTard = buildMatch({
      id: 'fige-2',
      terrain: 'A',
      statut: 'termine',
      heureFinPrevue: '2026-06-21T08:25:00.000Z',
    });
    const editable = buildMatch({ id: 'match-1', statut: 'a_jouer' });
    matchRepository.findByTour.mockResolvedValue([figeTot, figeTard, editable]);

    await useCase.execute([
      { terrain: 'A', matchIds: ['match-1'] },
      { terrain: 'B', matchIds: [] },
    ]);

    expect(planningService.recalculerHorairesManuel).toHaveBeenCalledWith(
      { A: [editable], B: [] },
      { A: new Date('2026-06-21T08:25:00.000Z'), B: null },
      tour.parametres,
      MAINTENANT,
    );
  });

  it('groupe les matchs éditables par terrain dans l’ordre des matchIds reçus (respecte la disposition imposée par l’admin)', async () => {
    const tour = buildTour();
    tourRepository.findCurrent.mockResolvedValue(tour);
    const matchA1 = buildMatch({ id: 'match-1' });
    const matchA2 = buildMatch({ id: 'match-2' });
    matchRepository.findByTour.mockResolvedValue([matchA1, matchA2]);

    await useCase.execute([
      { terrain: 'A', matchIds: ['match-2', 'match-1'] },
      { terrain: 'B', matchIds: [] },
    ]);

    expect(planningService.recalculerHorairesManuel).toHaveBeenCalledWith(
      { A: [matchA2, matchA1], B: [] },
      { A: null, B: null },
      tour.parametres,
      MAINTENANT,
    );
  });

  it('persiste les matchs recalculés via saveMany et délègue la reconstruction de la réponse à ObtenirTourCourantUseCase', async () => {
    const tour = buildTour();
    tourRepository.findCurrent.mockResolvedValue(tour);
    const editable = buildMatch({ id: 'match-1' });
    matchRepository.findByTour.mockResolvedValue([editable]);
    const recalcules = [
      buildMatch({ id: 'match-1', terrain: 'A', heureDebutPrevue: '2026-06-21T08:03:00.000Z' }),
    ];
    planningService.recalculerHorairesManuel.mockReturnValue(recalcules);

    const result = await useCase.execute([
      { terrain: 'A', matchIds: ['match-1'] },
      { terrain: 'B', matchIds: [] },
    ] as TerrainPlanningDto[]);

    expect(matchRepository.saveMany).toHaveBeenCalledWith(recalcules);
    expect(obtenirTourCourantUseCase.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual(TOUR_COURANT_DTO_PLACEHOLDER);
  });
});
