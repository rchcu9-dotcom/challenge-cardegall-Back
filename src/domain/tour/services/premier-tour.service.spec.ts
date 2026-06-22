import { PremierTourService } from './premier-tour.service';
import { Equipe } from '../../equipe/entities/equipe.entity';
import { Match } from '../../match/entities/match.entity';
import type { PlanningService } from '../../planning/services/planning.service';
import { ParametresTour } from '../entities/tour.entity';
import type { AppariementService } from './appariement.service';

function buildEquipe(overrides: Partial<Equipe> = {}): Equipe {
  return {
    id: 'equipe-1',
    nom: 'DSI',
    capitaineUserId: 'demo-dsi',
    nbJoueursApprox: 10,
    nbFemininesEnvisage: 3,
    statut: 'enrolee',
    dateInscription: '2026-06-13T00:00:00.000Z',
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

const PARAMETRES: ParametresTour = {
  nomsTerrains: ['A', 'B'],
  dureeMatchMinutes: 10,
  latenceMinutes: 2,
  delaiDemarrageMinutes: 3,
};

describe('PremierTourService', () => {
  let appariementService: jest.Mocked<AppariementService>;
  let planningService: jest.Mocked<PlanningService>;
  let service: PremierTourService;

  beforeEach(() => {
    appariementService = {
      genererAppariements: jest.fn().mockReturnValue({ paires: [], becotEquipeId: null }),
    };
    planningService = {
      calculerHoraires: jest.fn().mockReturnValue([]),
    };
    service = new PremierTourService(appariementService, planningService);
  });

  it('construit le classement initial neutre (points à 0, rang = position) et le transmet à genererAppariements', () => {
    const equipesEngagees = [
      buildEquipe({ id: 'equipe-1', nbFemininesReel: 3 }),
      buildEquipe({ id: 'equipe-2', nbFemininesReel: undefined, nbFemininesEnvisage: 4 }),
    ];

    service.construire({
      equipesEngagees,
      parametres: PARAMETRES,
      maintenant: new Date('2026-06-13T08:00:00.000Z'),
    });

    expect(appariementService.genererAppariements).toHaveBeenCalledWith(
      [
        expect.objectContaining({ equipeId: 'equipe-1', points: 0, rang: 1, nbFeminines: 3 }),
        expect.objectContaining({ equipeId: 'equipe-2', points: 0, rang: 2, nbFeminines: 4 }),
      ],
      [],
      [],
    );
  });

  it('construit le Tour n°1 en_cours avec les paramètres fournis et equipesBecot vide si nombre pair', () => {
    appariementService.genererAppariements.mockReturnValue({
      paires: [['equipe-1', 'equipe-2']],
      becotEquipeId: null,
    });

    const { tour } = service.construire({
      equipesEngagees: [buildEquipe({ id: 'equipe-1' }), buildEquipe({ id: 'equipe-2' })],
      parametres: PARAMETRES,
      maintenant: new Date('2026-06-13T08:00:00.000Z'),
    });

    expect(tour).toMatchObject({
      numero: 1,
      statut: 'en_cours',
      parametres: PARAMETRES,
      equipesBecot: [],
    });
    expect(typeof tour.id).toBe('string');
  });

  it('transmet les matchs appariés (sans horaire) à calculerHoraires avec les paramètres et la date fournis', () => {
    appariementService.genererAppariements.mockReturnValue({
      paires: [['equipe-1', 'equipe-2']],
      becotEquipeId: null,
    });
    const maintenant = new Date('2026-06-13T08:00:00.000Z');

    service.construire({
      equipesEngagees: [buildEquipe({ id: 'equipe-1' }), buildEquipe({ id: 'equipe-2' })],
      parametres: PARAMETRES,
      maintenant,
    });

    expect(planningService.calculerHoraires).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          equipeAId: 'equipe-1',
          equipeBId: 'equipe-2',
          estBye: false,
          statut: 'a_jouer',
        }),
      ],
      PARAMETRES,
      maintenant,
    );
  });

  it('retourne les matchs planifiés par calculerHoraires comme résultat des matchs', () => {
    appariementService.genererAppariements.mockReturnValue({
      paires: [['equipe-1', 'equipe-2']],
      becotEquipeId: null,
    });
    const matchPlanifie = buildMatch({ id: 'match-planifie-1' });
    planningService.calculerHoraires.mockReturnValue([matchPlanifie]);

    const { matches } = service.construire({
      equipesEngagees: [buildEquipe({ id: 'equipe-1' }), buildEquipe({ id: 'equipe-2' })],
      parametres: PARAMETRES,
      maintenant: new Date('2026-06-13T08:00:00.000Z'),
    });

    expect(matches).toEqual([matchPlanifie]);
  });

  it('ajoute un match bye (statut termine, equipeBId null) et equipesBecot = [becotId] en cas de nombre impair', () => {
    appariementService.genererAppariements.mockReturnValue({
      paires: [['equipe-1', 'equipe-2']],
      becotEquipeId: 'equipe-3',
    });
    const matchPlanifie = buildMatch({ id: 'match-planifie-1' });
    planningService.calculerHoraires.mockReturnValue([matchPlanifie]);

    const { tour, matches } = service.construire({
      equipesEngagees: [
        buildEquipe({ id: 'equipe-1' }),
        buildEquipe({ id: 'equipe-2' }),
        buildEquipe({ id: 'equipe-3' }),
      ],
      parametres: PARAMETRES,
      maintenant: new Date('2026-06-13T08:00:00.000Z'),
    });

    expect(tour.equipesBecot).toEqual(['equipe-3']);
    expect(matches).toEqual([
      matchPlanifie,
      expect.objectContaining({
        equipeAId: 'equipe-3',
        equipeBId: null,
        estBye: true,
        statut: 'termine',
      }),
    ]);
  });

  it('tous les matchs (planifiés et bye) référencent l’id du tour créé', () => {
    appariementService.genererAppariements.mockReturnValue({
      paires: [['equipe-1', 'equipe-2']],
      becotEquipeId: 'equipe-3',
    });
    planningService.calculerHoraires.mockImplementation((matches) => matches);

    const { tour, matches } = service.construire({
      equipesEngagees: [
        buildEquipe({ id: 'equipe-1' }),
        buildEquipe({ id: 'equipe-2' }),
        buildEquipe({ id: 'equipe-3' }),
      ],
      parametres: PARAMETRES,
      maintenant: new Date('2026-06-13T08:00:00.000Z'),
    });

    expect(matches.every((match) => match.tourId === tour.id)).toBe(true);
  });
});
