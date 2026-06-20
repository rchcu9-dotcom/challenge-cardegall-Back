import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TerminerTourUseCase } from './terminer-tour.use-case';
import { DemarrerPhaseFinaleUseCase } from '../../finale/use-cases/demarrer-phase-finale.use-case';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import type { MatchRepository } from '../../../domain/match/repositories/match.repository.interface';
import type { TourRepository } from '../../../domain/tour/repositories/tour.repository.interface';
import type { ClassementService } from '../../../domain/classement/services/classement.service';
import type { AppariementService } from '../../../domain/tour/services/appariement.service';
import type { CycleTournoiRepository } from '../../../domain/tour/repositories/cycle-tournoi.repository.interface';
import type { PlanningService } from '../../../domain/planning/services/planning.service';
import type { ClockPort } from '../../../domain/shared/ports/clock.port';
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

describe('TerminerTourUseCase', () => {
  let tourRepository: jest.Mocked<TourRepository>;
  let matchRepository: jest.Mocked<MatchRepository>;
  let equipeRepository: jest.Mocked<EquipeRepository>;
  let classementService: jest.Mocked<ClassementService>;
  let appariementService: jest.Mocked<AppariementService>;
  let cycleTournoiRepository: jest.Mocked<CycleTournoiRepository>;
  let planningService: jest.Mocked<PlanningService>;
  let clock: jest.Mocked<ClockPort>;
  let demarrerPhaseFinaleUseCase: jest.Mocked<DemarrerPhaseFinaleUseCase>;
  let useCase: TerminerTourUseCase;

  beforeEach(() => {
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
      save: jest.fn(),
      findByTour: jest.fn(),
      saveMany: jest.fn(async (matches) => matches),
    };
    equipeRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      findEnroleesOrdered: jest.fn(),
      reorder: jest.fn(),
    };
    classementService = { calculer: jest.fn() };
    appariementService = { genererAppariements: jest.fn() };
    cycleTournoiRepository = {
      estPhaseFinaleDeclenchee: jest.fn(),
      declencherPhaseFinale: jest.fn(),
    };
    planningService = { calculerHoraires: jest.fn((matches) => matches) };
    clock = { now: jest.fn(() => new Date('2026-06-13T08:00:00.000Z')) };
    demarrerPhaseFinaleUseCase = {
      execute: jest.fn().mockResolvedValue({
        demarree: true,
        statut: 'en_cours',
        demiFinaleA: null,
        demiFinaleB: null,
        finaleCardebat: null,
        finaleLeGall: null,
      }),
    } as unknown as jest.Mocked<DemarrerPhaseFinaleUseCase>;

    useCase = new TerminerTourUseCase(
      tourRepository,
      matchRepository,
      equipeRepository,
      classementService,
      appariementService,
      cycleTournoiRepository,
      planningService,
      clock,
      demarrerPhaseFinaleUseCase,
    );
  });

  it("lève NotFoundException si aucun tour n'est en cours", async () => {
    tourRepository.findCurrent.mockResolvedValue(null);

    await expect(useCase.execute('nouveau_tour')).rejects.toThrow(NotFoundException);
    expect(tourRepository.save).not.toHaveBeenCalled();
  });

  it('lève ConflictException si le tour courant n\'est pas "en_cours"', async () => {
    tourRepository.findCurrent.mockResolvedValue(buildTour({ statut: 'termine' }));

    await expect(useCase.execute('nouveau_tour')).rejects.toThrow(ConflictException);
    expect(matchRepository.findByTour).not.toHaveBeenCalled();
    expect(tourRepository.save).not.toHaveBeenCalled();
  });

  it('lève BadRequestException si au moins un match du tour n\'est pas "termine" ni "estBye"', async () => {
    tourRepository.findCurrent.mockResolvedValue(buildTour());
    matchRepository.findByTour.mockResolvedValue([
      buildMatch({ id: 'match-1', statut: 'termine' }),
      buildMatch({ id: 'match-2', statut: 'a_jouer' }),
    ]);

    await expect(useCase.execute('nouveau_tour')).rejects.toThrow(BadRequestException);
    expect(tourRepository.save).not.toHaveBeenCalled();
  });

  it('lève BadRequestException si le tour courant n\'a aucun match', async () => {
    tourRepository.findCurrent.mockResolvedValue(buildTour());
    matchRepository.findByTour.mockResolvedValue([]);

    await expect(useCase.execute('nouveau_tour')).rejects.toThrow(BadRequestException);
    expect(tourRepository.save).not.toHaveBeenCalled();
  });

  describe('action "nouveau_tour"', () => {
    it('clôture le tour courant, calcule le classement et persiste le nouveau tour + ses matchs', async () => {
      const tourCourant = buildTour({ id: 'tour-1', numero: 1, equipesBecot: [] });
      const matches = [
        buildMatch({ id: 'match-1', statut: 'termine' }),
        buildMatch({ id: 'match-2', statut: 'termine' }),
      ];
      const equipes = [
        buildEquipe({ id: 'equipe-1', statut: 'inscrite' }),
        buildEquipe({ id: 'equipe-2', statut: 'retiree' }),
      ];
      const classement = [
        buildClassementEntry({ equipeId: 'equipe-1', rang: 1 }),
        buildClassementEntry({ equipeId: 'equipe-2', rang: 2 }),
      ];

      tourRepository.findCurrent.mockResolvedValue(tourCourant);
      matchRepository.findByTour.mockResolvedValue(matches);
      equipeRepository.findAll.mockResolvedValue(equipes);
      matchRepository.findAll.mockResolvedValue(matches);
      classementService.calculer.mockReturnValue(classement);
      appariementService.genererAppariements.mockReturnValue({
        paires: [['equipe-1', 'equipe-2']],
        becotEquipeId: null,
      });

      const result = await useCase.execute('nouveau_tour');

      // Tour courant clôturé
      expect(tourRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'tour-1', statut: 'termine' }),
      );

      // Classement calculé sur les équipes non retirées uniquement
      expect(classementService.calculer).toHaveBeenCalledWith([equipes[0]], matches);

      // Appariement basé sur le classement, l'historique becot du tour courant et l'historique des matchs
      expect(appariementService.genererAppariements).toHaveBeenCalledWith(classement, [], matches);

      // Résultat : nouveau tour n°2, en_cours, paramètres copiés
      expect(result.action).toBe('nouveau_tour');
      if (result.action === 'nouveau_tour') {
        expect(result.tour.numero).toBe(2);
        expect(result.tour.statut).toBe('en_cours');
        expect(result.tour.parametres).toEqual(tourCourant.parametres);
        expect(result.tour.equipesBecot).toEqual([]);

        expect(result.matches).toHaveLength(1);
        expect(result.matches[0]).toMatchObject({
          tourId: result.tour.id,
          equipeAId: 'equipe-1',
          equipeBId: 'equipe-2',
          estBye: false,
          statut: 'a_jouer',
          scoreA: null,
          scoreB: null,
        });
      }

      expect(matchRepository.saveMany).toHaveBeenCalledTimes(1);
      expect(cycleTournoiRepository.declencherPhaseFinale).not.toHaveBeenCalled();
    });

    it('ajoute un match "bye" termine et met à jour equipesBecot quand becotEquipeId est défini', async () => {
      const tourCourant = buildTour({ id: 'tour-1', numero: 1, equipesBecot: ['equipe-9'] });
      const matches = [buildMatch({ id: 'match-1', statut: 'termine' })];
      const equipes = [buildEquipe({ id: 'equipe-1' })];
      const classement = [buildClassementEntry({ equipeId: 'equipe-1', rang: 1 })];

      tourRepository.findCurrent.mockResolvedValue(tourCourant);
      matchRepository.findByTour.mockResolvedValue(matches);
      equipeRepository.findAll.mockResolvedValue(equipes);
      matchRepository.findAll.mockResolvedValue(matches);
      classementService.calculer.mockReturnValue(classement);
      appariementService.genererAppariements.mockReturnValue({
        paires: [],
        becotEquipeId: 'equipe-1',
      });

      const result = await useCase.execute('nouveau_tour');

      expect(result.action).toBe('nouveau_tour');
      if (result.action === 'nouveau_tour') {
        expect(result.tour.equipesBecot).toEqual(['equipe-9', 'equipe-1']);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0]).toMatchObject({
          equipeAId: 'equipe-1',
          equipeBId: null,
          estBye: true,
          statut: 'termine',
        });
      }
    });

    it("transmet l'historique complet des matchs (tousLesMatchs, via matchRepository.findAll) en 3e argument de genererAppariements, distinct des matchs du seul tour courant", async () => {
      const tourCourant = buildTour({ id: 'tour-1', numero: 1, equipesBecot: [] });
      const matchesTourCourant = [buildMatch({ id: 'match-tour-1', statut: 'termine' })];
      const tousLesMatchs = [
        buildMatch({ id: 'match-tour-0', tourId: 'tour-0', statut: 'termine' }),
        ...matchesTourCourant,
      ];
      const equipes = [buildEquipe({ id: 'equipe-1', statut: 'inscrite' })];
      const classement = [buildClassementEntry({ equipeId: 'equipe-1', rang: 1 })];

      tourRepository.findCurrent.mockResolvedValue(tourCourant);
      matchRepository.findByTour.mockResolvedValue(matchesTourCourant);
      equipeRepository.findAll.mockResolvedValue(equipes);
      matchRepository.findAll.mockResolvedValue(tousLesMatchs);
      classementService.calculer.mockReturnValue(classement);
      appariementService.genererAppariements.mockReturnValue({ paires: [], becotEquipeId: 'equipe-1' });

      await useCase.execute('nouveau_tour');

      expect(appariementService.genererAppariements).toHaveBeenCalledWith(
        classement,
        tourCourant.equipesBecot,
        tousLesMatchs,
      );
      // S'assure que c'est bien tousLesMatchs (findAll), pas matchesTourCourant (findByTour)
      expect(appariementService.genererAppariements).not.toHaveBeenCalledWith(
        classement,
        tourCourant.equipesBecot,
        matchesTourCourant,
      );
    });

    it("copie nomsTerrains du tour courant dans une nouvelle référence de tableau (pas de mutation partagée)", async () => {
      const tourCourant = buildTour({ id: 'tour-1', numero: 1 });
      const matches = [buildMatch({ id: 'match-1', statut: 'termine' })];

      tourRepository.findCurrent.mockResolvedValue(tourCourant);
      matchRepository.findByTour.mockResolvedValue(matches);
      equipeRepository.findAll.mockResolvedValue([]);
      matchRepository.findAll.mockResolvedValue(matches);
      classementService.calculer.mockReturnValue([]);
      appariementService.genererAppariements.mockReturnValue({ paires: [], becotEquipeId: null });

      const result = await useCase.execute('nouveau_tour');

      expect(result.action).toBe('nouveau_tour');
      if (result.action === 'nouveau_tour') {
        expect(result.tour.parametres.nomsTerrains).toEqual(tourCourant.parametres.nomsTerrains);
        expect(result.tour.parametres.nomsTerrains).not.toBe(tourCourant.parametres.nomsTerrains);
      }
    });

    it('appelle planningService.calculerHoraires avec les matchs appairés, les paramètres du nouveau tour et clock.now(), et reporte le planning calculé dans result.matches', async () => {
      const tourCourant = buildTour({ id: 'tour-1', numero: 1, equipesBecot: [] });
      const matches = [buildMatch({ id: 'match-1', statut: 'termine' })];

      tourRepository.findCurrent.mockResolvedValue(tourCourant);
      matchRepository.findByTour.mockResolvedValue(matches);
      equipeRepository.findAll.mockResolvedValue([]);
      matchRepository.findAll.mockResolvedValue(matches);
      classementService.calculer.mockReturnValue([]);
      appariementService.genererAppariements.mockReturnValue({
        paires: [['equipe-1', 'equipe-2']],
        becotEquipeId: null,
      });
      planningService.calculerHoraires.mockImplementation((matchesAPlanifier) =>
        matchesAPlanifier.map((m) => ({
          ...m,
          terrain: 'A',
          heureDebutPrevue: '2026-06-13T08:03:00.000Z',
          heureFinPrevue: '2026-06-13T08:18:00.000Z',
        })),
      );

      const result = await useCase.execute('nouveau_tour');

      expect(planningService.calculerHoraires).toHaveBeenCalledTimes(1);
      const [matchesAPlanifier, parametresPasses, maintenant] =
        planningService.calculerHoraires.mock.calls[0];
      expect(matchesAPlanifier).toHaveLength(1);
      expect(matchesAPlanifier[0]).toMatchObject({ equipeAId: 'equipe-1', equipeBId: 'equipe-2' });
      expect(parametresPasses).toEqual(tourCourant.parametres);
      expect(maintenant).toEqual(new Date('2026-06-13T08:00:00.000Z'));

      expect(result.action).toBe('nouveau_tour');
      if (result.action === 'nouveau_tour') {
        expect(result.matches[0]).toMatchObject({
          terrain: 'A',
          heureDebutPrevue: '2026-06-13T08:03:00.000Z',
          heureFinPrevue: '2026-06-13T08:18:00.000Z',
        });
      }
    });

    it('exclut le match Becot du calcul du planning : il n\'est ni transmis à calculerHoraires, ni planifié (terrain/heures restent null)', async () => {
      const tourCourant = buildTour({ id: 'tour-1', numero: 1, equipesBecot: [] });
      const matches = [buildMatch({ id: 'match-1', statut: 'termine' })];

      tourRepository.findCurrent.mockResolvedValue(tourCourant);
      matchRepository.findByTour.mockResolvedValue(matches);
      equipeRepository.findAll.mockResolvedValue([buildEquipe({ id: 'equipe-1' })]);
      matchRepository.findAll.mockResolvedValue(matches);
      classementService.calculer.mockReturnValue([
        buildClassementEntry({ equipeId: 'equipe-1', rang: 1 }),
      ]);
      appariementService.genererAppariements.mockReturnValue({
        paires: [],
        becotEquipeId: 'equipe-1',
      });

      const result = await useCase.execute('nouveau_tour');

      // calculerHoraires n'est appelé qu'avec les matchs appairés (aucun ici, car becot uniquement)
      expect(planningService.calculerHoraires).toHaveBeenCalledWith([], expect.anything(), expect.anything());

      expect(result.action).toBe('nouveau_tour');
      if (result.action === 'nouveau_tour') {
        const matchBecot = result.matches.find((m) => m.estBye);
        expect(matchBecot).toMatchObject({
          equipeAId: 'equipe-1',
          equipeBId: null,
          estBye: true,
          terrain: null,
          heureDebutPrevue: null,
          heureFinPrevue: null,
        });
      }
    });

    it('utilise les `parametres` fournis en argument (et non une copie de ceux du tour courant) pour le nouveau tour et pour le calcul du planning', async () => {
      const tourCourant = buildTour({ id: 'tour-1', numero: 1, equipesBecot: [] });
      const matches = [buildMatch({ id: 'match-1', statut: 'termine' })];
      const parametresOverride = {
        nomsTerrains: ['Terrain 1', 'Terrain 2', 'Terrain 3'],
        dureeMatchMinutes: 20,
        latenceMinutes: 10,
        delaiDemarrageMinutes: 0,
      };

      tourRepository.findCurrent.mockResolvedValue(tourCourant);
      matchRepository.findByTour.mockResolvedValue(matches);
      equipeRepository.findAll.mockResolvedValue([]);
      matchRepository.findAll.mockResolvedValue(matches);
      classementService.calculer.mockReturnValue([]);
      appariementService.genererAppariements.mockReturnValue({
        paires: [['equipe-1', 'equipe-2']],
        becotEquipeId: null,
      });

      const result = await useCase.execute('nouveau_tour', parametresOverride);

      const [, parametresPasses] = planningService.calculerHoraires.mock.calls[0];
      expect(parametresPasses).toEqual(parametresOverride);

      expect(result.action).toBe('nouveau_tour');
      if (result.action === 'nouveau_tour') {
        expect(result.tour.parametres).toEqual(parametresOverride);
      }
    });
  });

  describe('action "phase_finale"', () => {
    it('clôture le tour courant, déclenche la phase finale et retourne le classement final', async () => {
      const tourCourant = buildTour({ id: 'tour-1', numero: 3, statut: 'en_cours' });
      const matches = [buildMatch({ id: 'match-1', statut: 'termine' })];
      const equipes = [
        buildEquipe({ id: 'equipe-1', statut: 'engagee' }),
        buildEquipe({ id: 'equipe-2', statut: 'retiree' }),
      ];
      const classementFinal = [
        buildClassementEntry({ equipeId: 'equipe-1', rang: 1 }),
      ];

      tourRepository.findCurrent.mockResolvedValue(tourCourant);
      matchRepository.findByTour.mockResolvedValue(matches);
      equipeRepository.findAll.mockResolvedValue(equipes);
      matchRepository.findAll.mockResolvedValue(matches);
      classementService.calculer.mockReturnValue(classementFinal);

      const result = await useCase.execute('phase_finale');

      expect(tourRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'tour-1', statut: 'termine' }),
      );
      expect(classementService.calculer).toHaveBeenCalledWith([equipes[0]], matches);
      expect(cycleTournoiRepository.declencherPhaseFinale).toHaveBeenCalledTimes(1);
      expect(appariementService.genererAppariements).not.toHaveBeenCalled();
      expect(tourRepository.save).toHaveBeenCalledTimes(1); // pas de création de nouveau tour
      expect(matchRepository.saveMany).not.toHaveBeenCalled();

      // Auto-démarrage de la phase finale (création des demi-finales) après déclenchement du flag
      expect(demarrerPhaseFinaleUseCase.execute).toHaveBeenCalledTimes(1);

      expect(result).toEqual({
        action: 'phase_finale',
        classementFinal,
        phaseFinaleDemarree: true,
      });
    });

    it('considère un match "estBye" comme un résultat complet même sans scores', async () => {
      const tourCourant = buildTour({ id: 'tour-1' });
      const matches = [
        buildMatch({ id: 'match-1', statut: 'termine' }),
        buildMatch({
          id: 'match-2',
          estBye: true,
          equipeBId: null,
          statut: 'termine',
          scoreA: null,
          scoreB: null,
        }),
      ];

      tourRepository.findCurrent.mockResolvedValue(tourCourant);
      matchRepository.findByTour.mockResolvedValue(matches);
      equipeRepository.findAll.mockResolvedValue([]);
      matchRepository.findAll.mockResolvedValue(matches);
      classementService.calculer.mockReturnValue([]);

      const result = await useCase.execute('phase_finale');

      expect(result.action).toBe('phase_finale');
    });

    it("retourne phaseFinaleDemarree: false sans lever d'erreur si DemarrerPhaseFinaleUseCase échoue pour une raison métier (pas assez d'équipes, ou déjà démarrée)", async () => {
      const tourCourant = buildTour({ id: 'tour-1' });
      const matches = [buildMatch({ id: 'match-1', statut: 'termine' })];
      const classementFinal = [buildClassementEntry({ equipeId: 'equipe-1', rang: 1 })];

      tourRepository.findCurrent.mockResolvedValue(tourCourant);
      matchRepository.findByTour.mockResolvedValue(matches);
      equipeRepository.findAll.mockResolvedValue([]);
      matchRepository.findAll.mockResolvedValue(matches);
      classementService.calculer.mockReturnValue(classementFinal);
      demarrerPhaseFinaleUseCase.execute.mockRejectedValue(
        new BadRequestException('Classement final insuffisant pour démarrer la phase finale'),
      );

      const result = await useCase.execute('phase_finale');

      expect(result).toEqual({
        action: 'phase_finale',
        classementFinal,
        phaseFinaleDemarree: false,
      });
    });

    it("remonte toute erreur de DemarrerPhaseFinaleUseCase qui n'est pas une BadRequestException/ConflictException", async () => {
      const tourCourant = buildTour({ id: 'tour-1' });
      const matches = [buildMatch({ id: 'match-1', statut: 'termine' })];

      tourRepository.findCurrent.mockResolvedValue(tourCourant);
      matchRepository.findByTour.mockResolvedValue(matches);
      equipeRepository.findAll.mockResolvedValue([]);
      matchRepository.findAll.mockResolvedValue(matches);
      classementService.calculer.mockReturnValue([]);
      demarrerPhaseFinaleUseCase.execute.mockRejectedValue(new Error('boom'));

      await expect(useCase.execute('phase_finale')).rejects.toThrow('boom');
    });
  });
});
