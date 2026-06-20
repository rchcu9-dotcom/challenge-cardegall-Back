import { PlanningNaiveService } from './planning-naive.service';
import { Match } from '../../match/entities/match.entity';
import { ParametresTour } from '../../tour/entities/tour.entity';

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

describe('PlanningNaiveService', () => {
  let service: PlanningNaiveService;

  beforeEach(() => {
    service = new PlanningNaiveService();
  });

  it('retourne un tableau vide si aucun match à planifier', () => {
    const parametres: ParametresTour = {
      nomsTerrains: ['A', 'B'],
      dureeMatchMinutes: 10,
      latenceMinutes: 2,
      delaiDemarrageMinutes: 3,
    };

    expect(service.calculerHoraires([], parametres, new Date('2026-06-13T08:00:00.000Z'))).toEqual(
      [],
    );
  });

  it('le premier match d\'un terrain démarre à maintenant + delaiDemarrageMinutes et dure dureeMatchMinutes', () => {
    const parametres: ParametresTour = {
      nomsTerrains: ['A', 'B'],
      dureeMatchMinutes: 10,
      latenceMinutes: 2,
      delaiDemarrageMinutes: 3,
    };
    const matches = [buildMatch({ id: 'match-1' })];

    const [planifie] = service.calculerHoraires(
      matches,
      parametres,
      new Date('2026-06-13T08:00:00.000Z'),
    );

    expect(planifie.terrain).toBe('A');
    expect(planifie.heureDebutPrevue).toBe('2026-06-13T08:03:00.000Z');
    expect(planifie.heureFinPrevue).toBe('2026-06-13T08:13:00.000Z');
  });

  it('assigne les terrains par round-robin (index du match modulo nombre de terrains)', () => {
    const parametres: ParametresTour = {
      nomsTerrains: ['A', 'B'],
      dureeMatchMinutes: 10,
      latenceMinutes: 2,
      delaiDemarrageMinutes: 3,
    };
    const matches = [
      buildMatch({ id: 'match-1' }),
      buildMatch({ id: 'match-2' }),
      buildMatch({ id: 'match-3' }),
    ];

    const planifies = service.calculerHoraires(
      matches,
      parametres,
      new Date('2026-06-13T08:00:00.000Z'),
    );

    expect(planifies.map((m) => m.terrain)).toEqual(['A', 'B', 'A']);
  });

  it('le 2e match sur un même terrain démarre à la fin du précédent + latenceMinutes', () => {
    const parametres: ParametresTour = {
      nomsTerrains: ['A', 'B'],
      dureeMatchMinutes: 10,
      latenceMinutes: 2,
      delaiDemarrageMinutes: 3,
    };
    const matches = [
      buildMatch({ id: 'match-1' }),
      buildMatch({ id: 'match-2' }),
      buildMatch({ id: 'match-3' }),
    ];

    const planifies = service.calculerHoraires(
      matches,
      parametres,
      new Date('2026-06-13T08:00:00.000Z'),
    );

    // match-3 est le 2e match sur le terrain A (match-1 : 08:03 -> 08:13)
    expect(planifies[2].terrain).toBe('A');
    expect(planifies[2].heureDebutPrevue).toBe('2026-06-13T08:15:00.000Z');
    expect(planifies[2].heureFinPrevue).toBe('2026-06-13T08:25:00.000Z');

    // match-2, seul sur le terrain B, démarre comme le 1er match
    expect(planifies[1].terrain).toBe('B');
    expect(planifies[1].heureDebutPrevue).toBe('2026-06-13T08:03:00.000Z');
  });

  it('avec un seul terrain, les matchs sont mis bout à bout (file unique)', () => {
    const parametres: ParametresTour = {
      nomsTerrains: ['A'],
      dureeMatchMinutes: 15,
      latenceMinutes: 5,
      delaiDemarrageMinutes: 3,
    };
    const matches = [buildMatch({ id: 'match-1' }), buildMatch({ id: 'match-2' })];

    const planifies = service.calculerHoraires(
      matches,
      parametres,
      new Date('2026-06-13T08:00:00.000Z'),
    );

    expect(planifies[0].heureDebutPrevue).toBe('2026-06-13T08:03:00.000Z');
    expect(planifies[0].heureFinPrevue).toBe('2026-06-13T08:18:00.000Z');
    // 2e match : fin du 1er (08:18) + latence (5 min) = 08:23
    expect(planifies[1].heureDebutPrevue).toBe('2026-06-13T08:23:00.000Z');
    expect(planifies[1].heureFinPrevue).toBe('2026-06-13T08:38:00.000Z');
  });

  it('ne mute pas les matchs reçus en entrée (retourne de nouvelles instances)', () => {
    const parametres: ParametresTour = {
      nomsTerrains: ['A'],
      dureeMatchMinutes: 10,
      latenceMinutes: 2,
      delaiDemarrageMinutes: 3,
    };
    const original = buildMatch({ id: 'match-1' });

    const [planifie] = service.calculerHoraires(
      [original],
      parametres,
      new Date('2026-06-13T08:00:00.000Z'),
    );

    expect(original.terrain).toBeNull();
    expect(original.heureDebutPrevue).toBeNull();
    expect(planifie).not.toBe(original);
    expect(planifie).toMatchObject({ id: 'match-1', equipeAId: 'equipe-1', equipeBId: 'equipe-2' });
  });
});
