import { ClassementNaiveService } from './classement-naive.service';
import { Equipe } from '../../equipe/entities/equipe.entity';
import { Match } from '../../match/entities/match.entity';

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

describe('ClassementNaiveService', () => {
  let service: ClassementNaiveService;

  beforeEach(() => {
    service = new ClassementNaiveService();
  });

  it('retourne une entrée par équipe initialisée à 0, classées par rang à partir de 1', () => {
    const equipes = [
      buildEquipe({ id: 'equipe-1', nbFemininesEnvisage: 3 }),
      buildEquipe({ id: 'equipe-2', nbFemininesEnvisage: 5 }),
    ];

    const classement = service.calculer(equipes, []);

    expect(classement).toHaveLength(2);
    classement.forEach((entry) => {
      expect(entry.points).toBe(0);
      expect(entry.victoires).toBe(0);
      expect(entry.nuls).toBe(0);
      expect(entry.defaites).toBe(0);
      expect(entry.butsMarques).toBe(0);
      expect(entry.butsConcedes).toBe(0);
      expect(entry.diffGenerale).toBe(0);
      expect(entry.diffParticuliere).toBe(0);
    });
    expect(classement.map((entry) => entry.rang)).toEqual([1, 2]);
  });

  it("utilise nbFemininesReel si renseigné, sinon nbFemininesEnvisage", () => {
    const equipes = [
      buildEquipe({ id: 'equipe-1', nbFemininesEnvisage: 3, nbFemininesReel: 5 }),
      buildEquipe({ id: 'equipe-2', nbFemininesEnvisage: 2 }),
    ];

    const classement = service.calculer(equipes, []);

    const entry1 = classement.find((e) => e.equipeId === 'equipe-1');
    const entry2 = classement.find((e) => e.equipeId === 'equipe-2');

    expect(entry1?.nbFeminines).toBe(5);
    expect(entry2?.nbFeminines).toBe(2);
  });

  it('attribue 3 points à la victoire, 0 à la défaite et met à jour buts marqués/concédés', () => {
    const equipes = [
      buildEquipe({ id: 'equipe-1' }),
      buildEquipe({ id: 'equipe-2' }),
    ];
    const matches = [
      buildMatch({
        equipeAId: 'equipe-1',
        equipeBId: 'equipe-2',
        scoreA: 3,
        scoreB: 1,
        statut: 'termine',
      }),
    ];

    const classement = service.calculer(equipes, matches);

    const vainqueur = classement.find((e) => e.equipeId === 'equipe-1')!;
    const perdant = classement.find((e) => e.equipeId === 'equipe-2')!;

    expect(vainqueur.points).toBe(3);
    expect(vainqueur.victoires).toBe(1);
    expect(vainqueur.defaites).toBe(0);
    expect(vainqueur.butsMarques).toBe(3);
    expect(vainqueur.butsConcedes).toBe(1);
    expect(vainqueur.diffGenerale).toBe(2);

    expect(perdant.points).toBe(0);
    expect(perdant.defaites).toBe(1);
    expect(perdant.victoires).toBe(0);
    expect(perdant.butsMarques).toBe(1);
    expect(perdant.butsConcedes).toBe(3);
    expect(perdant.diffGenerale).toBe(-2);
  });

  it('attribue 1 point à chaque équipe en cas de match nul', () => {
    const equipes = [
      buildEquipe({ id: 'equipe-1' }),
      buildEquipe({ id: 'equipe-2' }),
    ];
    const matches = [
      buildMatch({
        equipeAId: 'equipe-1',
        equipeBId: 'equipe-2',
        scoreA: 2,
        scoreB: 2,
        statut: 'termine',
      }),
    ];

    const classement = service.calculer(equipes, matches);

    classement.forEach((entry) => {
      expect(entry.points).toBe(1);
      expect(entry.nuls).toBe(1);
      expect(entry.victoires).toBe(0);
      expect(entry.defaites).toBe(0);
    });
  });

  it('ignore les matchs non "termine", les matchs bye et les matchs sans score', () => {
    const equipes = [
      buildEquipe({ id: 'equipe-1' }),
      buildEquipe({ id: 'equipe-2' }),
      buildEquipe({ id: 'equipe-3' }),
    ];
    const matches = [
      buildMatch({
        equipeAId: 'equipe-1',
        equipeBId: 'equipe-2',
        scoreA: 5,
        scoreB: 0,
        statut: 'a_jouer',
      }),
      buildMatch({
        equipeAId: 'equipe-3',
        equipeBId: null,
        estBye: true,
        statut: 'termine',
      }),
      buildMatch({
        equipeAId: 'equipe-1',
        equipeBId: 'equipe-3',
        scoreA: null,
        scoreB: null,
        statut: 'termine',
      }),
    ];

    const classement = service.calculer(equipes, matches);

    classement.forEach((entry) => {
      expect(entry.points).toBe(0);
      expect(entry.butsMarques).toBe(0);
      expect(entry.butsConcedes).toBe(0);
    });
  });

  it("trie par points décroissants puis par diffGenerale puis butsMarques puis nbFeminines (diffParticuliere toujours 0)", () => {
    const equipes = [
      buildEquipe({ id: 'equipe-1', nbFemininesEnvisage: 1 }),
      buildEquipe({ id: 'equipe-2', nbFemininesEnvisage: 1 }),
      buildEquipe({ id: 'equipe-3', nbFemininesEnvisage: 1 }),
      buildEquipe({ id: 'equipe-4', nbFemininesEnvisage: 5 }),
    ];
    const matches = [
      // equipe-1 gagne largement (diffGenerale +5, butsMarques 5)
      buildMatch({
        id: 'm1',
        equipeAId: 'equipe-1',
        equipeBId: 'equipe-2',
        scoreA: 5,
        scoreB: 0,
        statut: 'termine',
      }),
      // equipe-3 et equipe-4 font match nul 2-2, mêmes points (1 chacune) mais
      // equipe-4 a plus de nbFeminines en cas d'égalité (ici pas d'égalité de points avec equipe-2,
      // donc on teste surtout l'ordre points décroissant + tri secondaire entre equipe-3/equipe-4).
      buildMatch({
        id: 'm2',
        equipeAId: 'equipe-3',
        equipeBId: 'equipe-4',
        scoreA: 2,
        scoreB: 2,
        statut: 'termine',
      }),
    ];

    const classement = service.calculer(equipes, matches);

    // equipe-1 : 3 pts, en tête
    expect(classement[0].equipeId).toBe('equipe-1');
    expect(classement[0].rang).toBe(1);

    // equipe-3 et equipe-4 : 1 pt chacune (nul), à égalité de diffGenerale (0) et butsMarques (2),
    // départagées par nbFeminines (equipe-4 = 5 > equipe-3 = 1) => equipe-4 devant equipe-3.
    const equipe3 = classement.find((e) => e.equipeId === 'equipe-3')!;
    const equipe4 = classement.find((e) => e.equipeId === 'equipe-4')!;
    expect(equipe4.rang).toBeLessThan(equipe3.rang);

    // equipe-2 : 0 pt, dernière
    const equipe2 = classement.find((e) => e.equipeId === 'equipe-2')!;
    expect(equipe2.rang).toBe(4);

    // Tous les rangs sont uniques et de 1 à 4
    expect(classement.map((e) => e.rang).sort()).toEqual([1, 2, 3, 4]);
  });

  describe('diffParticuliere (confrontations directes entre équipes à égalité de points)', () => {
    it('départage 2 équipes à égalité de points par leur confrontation directe', () => {
      const equipes = [
        buildEquipe({ id: 'equipe-1', nbFemininesEnvisage: 1 }),
        buildEquipe({ id: 'equipe-2', nbFemininesEnvisage: 1 }),
        buildEquipe({ id: 'equipe-3', nbFemininesEnvisage: 1 }),
        buildEquipe({ id: 'equipe-4', nbFemininesEnvisage: 1 }),
      ];
      const matches = [
        // equipe-1 bat equipe-2 3-1 -> equipe-1 : 3 pts (scored 3 / conceded 1)
        buildMatch({
          id: 'm1',
          equipeAId: 'equipe-1',
          equipeBId: 'equipe-2',
          scoreA: 3,
          scoreB: 1,
          statut: 'termine',
        }),
        // equipe-3 et equipe-4 font match nul -> 1 pt chacune
        buildMatch({
          id: 'm2',
          equipeAId: 'equipe-3',
          equipeBId: 'equipe-4',
          scoreA: 1,
          scoreB: 1,
          statut: 'termine',
        }),
        // equipe-1 bat equipe-2 -> equipe-2 reste à 0 pt après m1, mais gagne ici contre equipe-3 -> equipe-2 = 3 pts
        buildMatch({
          id: 'm3',
          equipeAId: 'equipe-2',
          equipeBId: 'equipe-3',
          scoreA: 2,
          scoreB: 0,
          statut: 'termine',
        }),
        // equipe-1 perd contre equipe-4 -> equipe-1 reste à 3 pts (3 + 0), equipe-4 passe à 4 pts
        buildMatch({
          id: 'm4',
          equipeAId: 'equipe-1',
          equipeBId: 'equipe-4',
          scoreA: 0,
          scoreB: 1,
          statut: 'termine',
        }),
      ];
      // Points finaux : equipe-1 = 3 (m1) + 0 (m4) = 3 ; equipe-2 = 0 (m1) + 3 (m3) = 3 ;
      // equipe-3 = 1 (m2) + 0 (m3) = 1 ; equipe-4 = 1 (m2) + 3 (m4) = 4.
      // -> equipe-1 et equipe-2 à égalité (3 pts), et elles se sont affrontées directement (m1 : 3-1).

      const classement = service.calculer(equipes, matches);

      const equipe1 = classement.find((e) => e.equipeId === 'equipe-1')!;
      const equipe2 = classement.find((e) => e.equipeId === 'equipe-2')!;

      expect(equipe1.points).toBe(3);
      expect(equipe1.points).toBe(equipe2.points);

      // Confrontation directe equipe-1 vs equipe-2 : 3-1 -> diffParticuliere(equipe-1) = +2, diffParticuliere(equipe-2) = -2
      expect(equipe1.diffParticuliere).toBe(2);
      expect(equipe2.diffParticuliere).toBe(-2);

      // equipe-1 devant equipe-2 grâce à diffParticuliere
      expect(equipe1.rang).toBeLessThan(equipe2.rang);
    });

    it("ne compte pas, pour diffParticuliere, les confrontations avec une équipe d'un autre groupe de points", () => {
      const equipes = [
        buildEquipe({ id: 'equipe-1', nbFemininesEnvisage: 1 }),
        buildEquipe({ id: 'equipe-2', nbFemininesEnvisage: 1 }),
        buildEquipe({ id: 'equipe-3', nbFemininesEnvisage: 1 }),
      ];
      const matches = [
        // equipe-1 bat equipe-3 largement -> equipe-1 : 3 pts, equipe-3 : 0 pt
        buildMatch({
          id: 'm1',
          equipeAId: 'equipe-1',
          equipeBId: 'equipe-3',
          scoreA: 5,
          scoreB: 0,
          statut: 'termine',
        }),
        // equipe-1 et equipe-2 font match nul -> equipe-1 = 3 + 1 = 4 pts, equipe-2 = 1 pt
        buildMatch({
          id: 'm2',
          equipeAId: 'equipe-1',
          equipeBId: 'equipe-2',
          scoreA: 1,
          scoreB: 1,
          statut: 'termine',
        }),
      ];
      // Points finaux : equipe-1 = 4, equipe-2 = 1, equipe-3 = 0 -> aucune égalité de points,
      // chaque équipe est seule dans son groupe.

      const classement = service.calculer(equipes, matches);

      const equipe2 = classement.find((e) => e.equipeId === 'equipe-2')!;
      const equipe3 = classement.find((e) => e.equipeId === 'equipe-3')!;

      expect(equipe2.points).not.toBe(equipe3.points);
      // equipe-3 a joué (et perdu) contre equipe-1, mais equipe-1 n'est pas dans son groupe de points (0 pt)
      // -> cette confrontation n'est pas comptée dans diffParticuliere(equipe-3).
      expect(equipe2.diffParticuliere).toBe(0);
      expect(equipe3.diffParticuliere).toBe(0);
    });

    it('diffParticuliere = 0 pour une équipe seule à son total de points (sans impact sur le tri)', () => {
      const equipes = [
        buildEquipe({ id: 'equipe-1', nbFemininesEnvisage: 1 }),
        buildEquipe({ id: 'equipe-2', nbFemininesEnvisage: 1 }),
        buildEquipe({ id: 'equipe-3', nbFemininesEnvisage: 1 }),
      ];
      const matches = [
        buildMatch({
          id: 'm1',
          equipeAId: 'equipe-1',
          equipeBId: 'equipe-2',
          scoreA: 3,
          scoreB: 0,
          statut: 'termine',
        }),
        buildMatch({
          id: 'm2',
          equipeAId: 'equipe-2',
          equipeBId: 'equipe-3',
          scoreA: 1,
          scoreB: 1,
          statut: 'termine',
        }),
      ];

      const classement = service.calculer(equipes, matches);

      // equipe-1 : 3 pts (seule à ce total) -> diffParticuliere = 0
      const equipe1 = classement.find((e) => e.equipeId === 'equipe-1')!;
      expect(equipe1.points).toBe(3);
      expect(equipe1.diffParticuliere).toBe(0);
      expect(equipe1.rang).toBe(1);
    });

    it("trois équipes à égalité de points dont une paire ne s'est pas affrontée", () => {
      const equipes = [
        buildEquipe({ id: 'equipe-1', nbFemininesEnvisage: 1 }),
        buildEquipe({ id: 'equipe-2', nbFemininesEnvisage: 1 }),
        buildEquipe({ id: 'equipe-3', nbFemininesEnvisage: 1 }),
        buildEquipe({ id: 'equipe-4', nbFemininesEnvisage: 1 }),
      ];
      const matches = [
        // equipe-1 bat equipe-2 -> equipe-1 : 3 pts (scored 2 / conceded 0)
        buildMatch({
          id: 'm1',
          equipeAId: 'equipe-1',
          equipeBId: 'equipe-2',
          scoreA: 2,
          scoreB: 0,
          statut: 'termine',
        }),
        // equipe-1 perd contre equipe-3 -> equipe-1 reste à 3 pts (3 + 0), equipe-3 : 3 pts
        buildMatch({
          id: 'm2',
          equipeAId: 'equipe-1',
          equipeBId: 'equipe-3',
          scoreA: 0,
          scoreB: 1,
          statut: 'termine',
        }),
        // equipe-2 bat equipe-4 -> equipe-2 passe de 0 à 3 pts
        buildMatch({
          id: 'm3',
          equipeAId: 'equipe-2',
          equipeBId: 'equipe-4',
          scoreA: 3,
          scoreB: 0,
          statut: 'termine',
        }),
      ];
      // Points finaux : equipe-1 = 3, equipe-2 = 3, equipe-3 = 3, equipe-4 = 0.
      // Groupe à 3 pts : {equipe-1, equipe-2, equipe-3}. equipe-1 a affronté equipe-2 (m1) et equipe-3 (m2),
      // mais equipe-2 et equipe-3 ne se sont jamais affrontées.

      const classement = service.calculer(equipes, matches);

      const equipe1 = classement.find((e) => e.equipeId === 'equipe-1')!;
      const equipe2 = classement.find((e) => e.equipeId === 'equipe-2')!;
      const equipe3 = classement.find((e) => e.equipeId === 'equipe-3')!;

      expect(equipe1.points).toBe(3);
      expect(equipe2.points).toBe(3);
      expect(equipe3.points).toBe(3);

      // equipe-1 : m1 (scored 2 / conceded 0) + m2 (scored 0 / conceded 1) = diff +1
      expect(equipe1.diffParticuliere).toBe(1);
      // equipe-2 : seule confrontation avec un membre du groupe = m1 (scored 0 / conceded 2) = diff -2
      expect(equipe2.diffParticuliere).toBe(-2);
      // equipe-3 : seule confrontation avec un membre du groupe = m2 (scored 1 / conceded 0) = diff +1
      // (equipe-3 n'a jamais affronté equipe-2, mais reçoit quand même un diffParticuliere non nul via equipe-1)
      expect(equipe3.diffParticuliere).toBe(1);

      // equipe-2 (diffParticuliere le plus bas du groupe) classée derrière equipe-1 et equipe-3
      expect(equipe2.rang).toBeGreaterThan(equipe1.rang);
      expect(equipe2.rang).toBeGreaterThan(equipe3.rang);
    });
  });

  it('cumule les statistiques sur plusieurs matchs pour la même équipe', () => {
    const equipes = [
      buildEquipe({ id: 'equipe-1' }),
      buildEquipe({ id: 'equipe-2' }),
      buildEquipe({ id: 'equipe-3' }),
    ];
    const matches = [
      buildMatch({
        id: 'm1',
        equipeAId: 'equipe-1',
        equipeBId: 'equipe-2',
        scoreA: 2,
        scoreB: 1,
        statut: 'termine',
      }),
      buildMatch({
        id: 'm2',
        equipeAId: 'equipe-1',
        equipeBId: 'equipe-3',
        scoreA: 0,
        scoreB: 0,
        statut: 'termine',
      }),
    ];

    const classement = service.calculer(equipes, matches);

    const equipe1 = classement.find((e) => e.equipeId === 'equipe-1')!;
    expect(equipe1.points).toBe(4); // 3 (victoire) + 1 (nul)
    expect(equipe1.victoires).toBe(1);
    expect(equipe1.nuls).toBe(1);
    expect(equipe1.butsMarques).toBe(2);
    expect(equipe1.butsConcedes).toBe(1);
    expect(equipe1.diffGenerale).toBe(1);
  });
});
