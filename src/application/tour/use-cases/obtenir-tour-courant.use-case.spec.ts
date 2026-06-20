import { NotFoundException } from '@nestjs/common';
import { ObtenirTourCourantUseCase } from './obtenir-tour-courant.use-case';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import type { MatchRepository } from '../../../domain/match/repositories/match.repository.interface';
import type { TourRepository } from '../../../domain/tour/repositories/tour.repository.interface';
import type { ClassementService } from '../../../domain/classement/services/classement.service';
import { Equipe } from '../../../domain/equipe/entities/equipe.entity';
import { Match } from '../../../domain/match/entities/match.entity';
import { Tour } from '../../../domain/tour/entities/tour.entity';
import { ClassementEntry } from '../../../domain/classement/entities/classement-entry.entity';

function buildTour(overrides: Partial<Tour> = {}): Tour {
  return {
    id: 'tour-1',
    numero: 1,
    statut: 'en_cours',
    parametres: {
      nomsTerrains: ['A', 'B'],
      dureeMatchMinutes: 15,
      latenceMinutes: 5,
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

function buildEquipe(overrides: Partial<Equipe> = {}): Equipe {
  return {
    id: 'equipe-1',
    nom: 'DSI',
    capitaineUserId: 'demo-dsi',
    nbJoueursApprox: 10,
    nbFemininesEnvisage: 3,
    statut: 'inscrite',
    dateInscription: '2026-06-13T00:00:00.000Z',
    ...overrides,
  };
}

function buildClassementEntry(overrides: Partial<ClassementEntry> = {}): ClassementEntry {
  return {
    equipeId: 'equipe-1',
    points: 0,
    victoires: 0,
    nuls: 0,
    defaites: 0,
    butsMarques: 0,
    butsConcedes: 0,
    diffGenerale: 0,
    diffParticuliere: 0,
    nbFeminines: 0,
    rang: 1,
    ...overrides,
  };
}

describe('ObtenirTourCourantUseCase', () => {
  let tourRepository: jest.Mocked<TourRepository>;
  let matchRepository: jest.Mocked<MatchRepository>;
  let equipeRepository: jest.Mocked<EquipeRepository>;
  let classementService: jest.Mocked<ClassementService>;
  let useCase: ObtenirTourCourantUseCase;

  beforeEach(() => {
    tourRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      findCurrent: jest.fn(),
      findLast: jest.fn(),
    };
    matchRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      findByTour: jest.fn(),
      saveMany: jest.fn(),
    };
    equipeRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      findEnroleesOrdered: jest.fn(),
      reorder: jest.fn(),
    };
    classementService = { calculer: jest.fn() };

    useCase = new ObtenirTourCourantUseCase(
      tourRepository,
      matchRepository,
      equipeRepository,
      classementService,
    );
  });

  it("lève NotFoundException si aucun tour n'est en cours", async () => {
    tourRepository.findCurrent.mockResolvedValue(null);

    await expect(useCase.execute()).rejects.toThrow(NotFoundException);
  });

  it('retourne le tour courant, ses matchs et le classement calculé sur les équipes non retirées', async () => {
    const tour = buildTour();
    const matches = [buildMatch({ id: 'match-1' }), buildMatch({ id: 'match-2', estBye: true, equipeBId: null, statut: 'termine' })];
    const equipes = [
      buildEquipe({ id: 'equipe-1', statut: 'inscrite' }),
      buildEquipe({ id: 'equipe-2', statut: 'retiree' }),
      buildEquipe({ id: 'equipe-3', statut: 'engagee' }),
    ];
    const tousLesMatchs = [...matches, buildMatch({ id: 'match-3', tourId: 'tour-0' })];
    const classement = [buildClassementEntry({ equipeId: 'equipe-1', rang: 1 })];

    tourRepository.findCurrent.mockResolvedValue(tour);
    matchRepository.findByTour.mockResolvedValue(matches);
    equipeRepository.findAll.mockResolvedValue(equipes);
    matchRepository.findAll.mockResolvedValue(tousLesMatchs);
    classementService.calculer.mockReturnValue(classement);

    const result = await useCase.execute();

    expect(result.tour).toEqual(tour);
    expect(result.matches).toEqual(matches);
    expect(result.classement).toEqual(classement);
    expect(matchRepository.findByTour).toHaveBeenCalledWith('tour-1');

    // Équipes filtrées : seules les équipes non "retiree" sont transmises au ClassementService.
    expect(classementService.calculer).toHaveBeenCalledWith(
      [equipes[0], equipes[2]],
      tousLesMatchs,
    );
  });

  it('resultatsComplets = true si tous les matchs du tour sont "termine" ou "estBye"', async () => {
    const tour = buildTour();
    const matches = [
      buildMatch({ id: 'match-1', statut: 'termine' }),
      buildMatch({ id: 'match-2', estBye: true, equipeBId: null, statut: 'termine' }),
    ];

    tourRepository.findCurrent.mockResolvedValue(tour);
    matchRepository.findByTour.mockResolvedValue(matches);
    equipeRepository.findAll.mockResolvedValue([]);
    matchRepository.findAll.mockResolvedValue(matches);
    classementService.calculer.mockReturnValue([]);

    const result = await useCase.execute();

    expect(result.resultatsComplets).toBe(true);
  });

  it('resultatsComplets = false si au moins un match n\'est pas "termine" (et n\'est pas un bye)', async () => {
    const tour = buildTour();
    const matches = [
      buildMatch({ id: 'match-1', statut: 'termine' }),
      buildMatch({ id: 'match-2', statut: 'a_jouer' }),
    ];

    tourRepository.findCurrent.mockResolvedValue(tour);
    matchRepository.findByTour.mockResolvedValue(matches);
    equipeRepository.findAll.mockResolvedValue([]);
    matchRepository.findAll.mockResolvedValue(matches);
    classementService.calculer.mockReturnValue([]);

    const result = await useCase.execute();

    expect(result.resultatsComplets).toBe(false);
  });

  it('resultatsComplets = false si le tour courant n\'a aucun match', async () => {
    const tour = buildTour();

    tourRepository.findCurrent.mockResolvedValue(tour);
    matchRepository.findByTour.mockResolvedValue([]);
    equipeRepository.findAll.mockResolvedValue([]);
    matchRepository.findAll.mockResolvedValue([]);
    classementService.calculer.mockReturnValue([]);

    const result = await useCase.execute();

    expect(result.resultatsComplets).toBe(false);
  });
});
