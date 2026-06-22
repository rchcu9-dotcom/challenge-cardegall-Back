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

describe('PlanningNaiveService.recalculerHorairesManuel', () => {
  let service: PlanningNaiveService;

  beforeEach(() => {
    service = new PlanningNaiveService();
  });

  const parametres: ParametresTour = {
    nomsTerrains: ['A', 'B'],
    dureeMatchMinutes: 10,
    latenceMinutes: 2,
    delaiDemarrageMinutes: 3,
  };

  it('retourne un tableau vide si aucun terrain à recalculer', () => {
    const result = service.recalculerHorairesManuel(
      {},
      {},
      parametres,
      new Date('2026-06-13T08:00:00.000Z'),
    );

    expect(result).toEqual([]);
  });

  it("sans ancre pour un terrain, le 1er match démarre à maintenant + delaiDemarrageMinutes (même règle que calculerHoraires)", () => {
    const matchesParTerrain = { A: [buildMatch({ id: 'match-1' })] };
    const ancrePartTerrain = { A: null };

    const [planifie] = service.recalculerHorairesManuel(
      matchesParTerrain,
      ancrePartTerrain,
      parametres,
      new Date('2026-06-13T08:00:00.000Z'),
    );

    expect(planifie.terrain).toBe('A');
    expect(planifie.heureDebutPrevue).toBe('2026-06-13T08:03:00.000Z');
    expect(planifie.heureFinPrevue).toBe('2026-06-13T08:13:00.000Z');
  });

  it('avec une ancre pour un terrain, le 1er match de ce terrain démarre à l’ancre (sans tenir compte de "maintenant")', () => {
    const matchesParTerrain = { A: [buildMatch({ id: 'match-1' })] };
    const ancrePartTerrain = { A: new Date('2026-06-13T09:00:00.000Z') };

    const [planifie] = service.recalculerHorairesManuel(
      matchesParTerrain,
      ancrePartTerrain,
      parametres,
      new Date('2026-06-13T08:00:00.000Z'),
    );

    expect(planifie.heureDebutPrevue).toBe('2026-06-13T09:00:00.000Z');
    expect(planifie.heureFinPrevue).toBe('2026-06-13T09:10:00.000Z');
  });

  it('respecte l’ordre fourni par terrain (réordonnancement intra-terrain) et chaîne les matchs suivants', () => {
    const matchesParTerrain = {
      A: [buildMatch({ id: 'match-2' }), buildMatch({ id: 'match-1' })],
    };
    const ancrePartTerrain = { A: null };

    const planifies = service.recalculerHorairesManuel(
      matchesParTerrain,
      ancrePartTerrain,
      parametres,
      new Date('2026-06-13T08:00:00.000Z'),
    );

    expect(planifies.map((m) => m.id)).toEqual(['match-2', 'match-1']);
    expect(planifies[0].heureDebutPrevue).toBe('2026-06-13T08:03:00.000Z');
    // match-1, désormais 2e sur le terrain : fin de match-2 (08:13) + latence (2 min) = 08:15
    expect(planifies[1].heureDebutPrevue).toBe('2026-06-13T08:15:00.000Z');
  });

  it('assigne le terrain de chaque match à la clé de groupe (déplacement inter-terrain), sans round-robin', () => {
    const matchesParTerrain = {
      A: [],
      B: [buildMatch({ id: 'match-1', terrain: 'A' })],
    };
    const ancrePartTerrain = { A: null, B: null };

    const planifies = service.recalculerHorairesManuel(
      matchesParTerrain,
      ancrePartTerrain,
      parametres,
      new Date('2026-06-13T08:00:00.000Z'),
    );

    expect(planifies).toHaveLength(1);
    expect(planifies[0].terrain).toBe('B');
  });

  it('traite chaque terrain indépendamment (une ancre par terrain, pas de partage entre terrains)', () => {
    const matchesParTerrain = {
      A: [buildMatch({ id: 'match-1' })],
      B: [buildMatch({ id: 'match-2' })],
    };
    const ancrePartTerrain = { A: new Date('2026-06-13T10:00:00.000Z'), B: null };

    const planifies = service.recalculerHorairesManuel(
      matchesParTerrain,
      ancrePartTerrain,
      parametres,
      new Date('2026-06-13T08:00:00.000Z'),
    );

    const parId = new Map(planifies.map((m) => [m.id, m]));
    expect(parId.get('match-1')?.heureDebutPrevue).toBe('2026-06-13T10:00:00.000Z');
    expect(parId.get('match-2')?.heureDebutPrevue).toBe('2026-06-13T08:03:00.000Z');
  });
});
