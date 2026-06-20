import { PhaseFinaleService } from './phase-finale.service';
import { ClassementEntry } from '../../classement/entities/classement-entry.entity';
import { MatchFinale } from '../entities/match-finale.entity';

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

function buildMatchFinale(overrides: Partial<MatchFinale> = {}): MatchFinale {
  return {
    id: 'match-1',
    type: 'demi_finale_a',
    equipeAId: 'equipe-1',
    equipeBId: 'equipe-2',
    scoreA: null,
    scoreB: null,
    statut: 'a_jouer',
    ...overrides,
  };
}

describe('PhaseFinaleService', () => {
  let service: PhaseFinaleService;

  beforeEach(() => {
    service = new PhaseFinaleService();
  });

  describe('creerDemiFinales', () => {
    it('crée demiFinaleA (1er vs 4e) et demiFinaleB (2e vs 3e) à partir du classement trié', () => {
      const classement = [
        buildClassementEntry({ equipeId: 'equipe-3', rang: 3 }),
        buildClassementEntry({ equipeId: 'equipe-1', rang: 1 }),
        buildClassementEntry({ equipeId: 'equipe-4', rang: 4 }),
        buildClassementEntry({ equipeId: 'equipe-2', rang: 2 }),
      ];

      const { demiFinaleA, demiFinaleB } = service.creerDemiFinales(classement);

      expect(demiFinaleA).toMatchObject({
        type: 'demi_finale_a',
        equipeAId: 'equipe-1',
        equipeBId: 'equipe-4',
        scoreA: null,
        scoreB: null,
        statut: 'a_jouer',
      });
      expect(demiFinaleB).toMatchObject({
        type: 'demi_finale_b',
        equipeAId: 'equipe-2',
        equipeBId: 'equipe-3',
        scoreA: null,
        scoreB: null,
        statut: 'a_jouer',
      });
      expect(typeof demiFinaleA.id).toBe('string');
      expect(demiFinaleA.id).not.toBe(demiFinaleB.id);
    });

    it('ne mute pas le tableau de classement reçu (tri sur une copie)', () => {
      const classement = [
        buildClassementEntry({ equipeId: 'equipe-2', rang: 2 }),
        buildClassementEntry({ equipeId: 'equipe-1', rang: 1 }),
        buildClassementEntry({ equipeId: 'equipe-4', rang: 4 }),
        buildClassementEntry({ equipeId: 'equipe-3', rang: 3 }),
      ];
      const original = [...classement];

      service.creerDemiFinales(classement);

      expect(classement).toEqual(original);
    });

    it('lève une erreur si le classement contient moins de 4 équipes', () => {
      const classement = [
        buildClassementEntry({ equipeId: 'equipe-1', rang: 1 }),
        buildClassementEntry({ equipeId: 'equipe-2', rang: 2 }),
      ];

      expect(() => service.creerDemiFinales(classement)).toThrow(
        'Classement final insuffisant pour démarrer la phase finale',
      );
    });
  });

  describe('determinerVainqueurEtVaincu', () => {
    it('équipe A vainqueur si scoreA > scoreB', () => {
      const match = buildMatchFinale({ equipeAId: 'equipe-1', equipeBId: 'equipe-2', scoreA: 3, scoreB: 1 });

      expect(service.determinerVainqueurEtVaincu(match)).toEqual({
        vainqueurId: 'equipe-1',
        vaincuId: 'equipe-2',
      });
    });

    it('équipe B vainqueur si scoreB > scoreA', () => {
      const match = buildMatchFinale({ equipeAId: 'equipe-1', equipeBId: 'equipe-2', scoreA: 1, scoreB: 3 });

      expect(service.determinerVainqueurEtVaincu(match)).toEqual({
        vainqueurId: 'equipe-2',
        vaincuId: 'equipe-1',
      });
    });

    it.each([
      ['equipeAId', { equipeAId: null }],
      ['equipeBId', { equipeBId: null }],
      ['scoreA', { scoreA: null }],
      ['scoreB', { scoreB: null }],
    ])('lève une erreur si %s est null', (_label, overrides) => {
      const match = buildMatchFinale({ scoreA: 2, scoreB: 1, ...overrides });

      expect(() => service.determinerVainqueurEtVaincu(match)).toThrow(
        `Match de phase finale ${match.id} incomplet`,
      );
    });
  });

  describe('creerFinales', () => {
    it('crée finaleCardebat (vainqueurs) et finaleLeGall (vaincus) à partir des deux demi-finales', () => {
      const demiFinaleA = buildMatchFinale({
        id: 'demi-a',
        type: 'demi_finale_a',
        equipeAId: 'equipe-1',
        equipeBId: 'equipe-4',
        scoreA: 3,
        scoreB: 1,
        statut: 'termine',
      });
      const demiFinaleB = buildMatchFinale({
        id: 'demi-b',
        type: 'demi_finale_b',
        equipeAId: 'equipe-2',
        equipeBId: 'equipe-3',
        scoreA: 0,
        scoreB: 2,
        statut: 'termine',
      });

      const { finaleCardebat, finaleLeGall } = service.creerFinales(demiFinaleA, demiFinaleB);

      expect(finaleCardebat).toMatchObject({
        type: 'finale_cardebat',
        equipeAId: 'equipe-1',
        equipeBId: 'equipe-3',
        scoreA: null,
        scoreB: null,
        statut: 'a_jouer',
      });
      expect(finaleLeGall).toMatchObject({
        type: 'finale_le_gall',
        equipeAId: 'equipe-4',
        equipeBId: 'equipe-2',
        scoreA: null,
        scoreB: null,
        statut: 'a_jouer',
      });
      expect(typeof finaleCardebat.id).toBe('string');
      expect(finaleCardebat.id).not.toBe(finaleLeGall.id);
    });

    it('lève une erreur si une demi-finale est incomplète (score manquant)', () => {
      const demiFinaleA = buildMatchFinale({ scoreA: null, scoreB: null, statut: 'a_jouer' });
      const demiFinaleB = buildMatchFinale({ scoreA: 2, scoreB: 1, statut: 'termine' });

      expect(() => service.creerFinales(demiFinaleA, demiFinaleB)).toThrow(
        `Match de phase finale ${demiFinaleA.id} incomplet`,
      );
    });
  });
});
