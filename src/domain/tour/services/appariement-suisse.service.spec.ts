import { AppariementSuisseService } from './appariement-suisse.service';
import { ClassementEntry } from '../../classement/entities/classement-entry.entity';
import { Match } from '../../match/entities/match.entity';

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

/** Classement à 4 équipes, rangs 1 à 4, dans l'ordre. */
function classement4(): ClassementEntry[] {
  return [
    buildClassementEntry({ equipeId: 'equipe-1', rang: 1 }),
    buildClassementEntry({ equipeId: 'equipe-2', rang: 2 }),
    buildClassementEntry({ equipeId: 'equipe-3', rang: 3 }),
    buildClassementEntry({ equipeId: 'equipe-4', rang: 4 }),
  ];
}

describe('AppariementSuisseService', () => {
  let service: AppariementSuisseService;

  beforeEach(() => {
    service = new AppariementSuisseService();
  });

  describe('appariement de base', () => {
    it('apparie 1v2, 3v4, ... sur un classement pair déjà ordonné', () => {
      const result = service.genererAppariements(classement4(), []);

      expect(result).toEqual({
        paires: [
          ['equipe-1', 'equipe-2'],
          ['equipe-3', 'equipe-4'],
        ],
        becotEquipeId: null,
      });
    });

    it('réordonne par rang avant appariement si le classement est passé dans le désordre', () => {
      const classementDesordonne = [
        buildClassementEntry({ equipeId: 'equipe-3', rang: 3 }),
        buildClassementEntry({ equipeId: 'equipe-1', rang: 1 }),
        buildClassementEntry({ equipeId: 'equipe-4', rang: 4 }),
        buildClassementEntry({ equipeId: 'equipe-2', rang: 2 }),
      ];

      const result = service.genererAppariements(classementDesordonne, []);

      expect(result).toEqual({
        paires: [
          ['equipe-1', 'equipe-2'],
          ['equipe-3', 'equipe-4'],
        ],
        becotEquipeId: null,
      });
    });

    it('retourne un résultat vide pour un classement vide', () => {
      const result = service.genererAppariements([], []);

      expect(result).toEqual({ paires: [], becotEquipeId: null });
    });

    it('apparie 6 équipes en 3 paires (1v2, 3v4, 5v6)', () => {
      const classement6 = [
        ...classement4(),
        buildClassementEntry({ equipeId: 'equipe-5', rang: 5 }),
        buildClassementEntry({ equipeId: 'equipe-6', rang: 6 }),
      ];

      const result = service.genererAppariements(classement6, []);

      expect(result.paires).toEqual([
        ['equipe-1', 'equipe-2'],
        ['equipe-3', 'equipe-4'],
        ['equipe-5', 'equipe-6'],
      ]);
      expect(result.becotEquipeId).toBeNull();
    });
  });

  describe('sélection du Becot — nombre impair d\'équipes', () => {
    function classement5(): ClassementEntry[] {
      return [
        ...classement4(),
        buildClassementEntry({ equipeId: 'equipe-5', rang: 5 }),
      ];
    }

    it('désigne la dernière équipe du classement comme Becot quand equipesBecot est vide', () => {
      const result = service.genererAppariements(classement5(), []);

      expect(result.becotEquipeId).toBe('equipe-5');
      expect(result.paires).toEqual([
        ['equipe-1', 'equipe-2'],
        ['equipe-3', 'equipe-4'],
      ]);
    });

    it('choisit la dernière équipe du classement non encore Becot quand equipesBecot est partiel', () => {
      // equipe-5 (dernière) déjà Becot lors d'un tour précédent : on remonte
      // jusqu'à equipe-4 (avant-dernière), non encore Becot.
      const result = service.genererAppariements(classement5(), ['equipe-5']);

      expect(result.becotEquipeId).toBe('equipe-4');
      // Participants restants : equipe-1, equipe-2, equipe-3, equipe-5 (ordonnés par rang)
      expect(result.paires).toEqual([
        ['equipe-1', 'equipe-2'],
        ['equipe-3', 'equipe-5'],
      ]);
    });

    it('repart de la dernière équipe du classement (reset de cycle) quand equipesBecot couvre déjà toutes les équipes', () => {
      // Toutes les équipes du classement courant ont déjà été Becot au moins une fois.
      const equipesBecot = ['equipe-1', 'equipe-2', 'equipe-3', 'equipe-4', 'equipe-5'];

      const result = service.genererAppariements(classement5(), equipesBecot);

      // Cycle complet => on repart comme si equipesBecot était vide : dernière équipe du classement.
      expect(result.becotEquipeId).toBe('equipe-5');
      expect(result.paires).toEqual([
        ['equipe-1', 'equipe-2'],
        ['equipe-3', 'equipe-4'],
      ]);
    });

    it("ne désigne aucun Becot et n'altère pas l'appariement pour un nombre pair d'équipes même avec equipesBecot non vide", () => {
      const result = service.genererAppariements(classement4(), ['equipe-1', 'equipe-2']);

      expect(result.becotEquipeId).toBeNull();
      expect(result.paires).toEqual([
        ['equipe-1', 'equipe-2'],
        ['equipe-3', 'equipe-4'],
      ]);
    });
  });

  describe('évitement des rematchs', () => {
    it("échange avec la paire de rang inférieur quand la paire 1v2 a déjà été jouée et que l'échange ne crée pas de nouveau rematch", () => {
      // Historique : equipe-1 vs equipe-2 déjà joué.
      const historiqueMatchs = [
        buildMatch({ id: 'm1', equipeAId: 'equipe-1', equipeBId: 'equipe-2', statut: 'termine', scoreA: 1, scoreB: 0 }),
      ];

      const result = service.genererAppariements(classement4(), [], historiqueMatchs);

      // Échange : equipe-2 (rang 2) <-> equipe-3 (rang 3)
      // => (equipe-1, equipe-3) et (equipe-2, equipe-4), aucun des deux n'est dans l'historique.
      expect(result.paires).toEqual([
        ['equipe-1', 'equipe-3'],
        ['equipe-2', 'equipe-4'],
      ]);
      expect(result.becotEquipeId).toBeNull();
    });

    it("l'évitement de rematch fonctionne indépendamment de l'ordre des équipes dans le match historique (clé normalisée)", () => {
      // Match historique enregistré dans l'ordre inverse (equipeB vs equipeA).
      const historiqueMatchs = [
        buildMatch({ id: 'm1', equipeAId: 'equipe-2', equipeBId: 'equipe-1', statut: 'termine', scoreA: 0, scoreB: 1 }),
      ];

      const result = service.genererAppariements(classement4(), [], historiqueMatchs);

      expect(result.paires).toEqual([
        ['equipe-1', 'equipe-3'],
        ['equipe-2', 'equipe-4'],
      ]);
    });

    it("accepte le rematch initial si l'échange créerait un nouveau rematch sur une des deux paires", () => {
      // equipe-1 vs equipe-2 déjà joué (rematch sur la paire de base).
      // equipe-1 vs equipe-3 également déjà joué => l'échange créerait un nouveau rematch
      // sur la première paire (equipe-1, equipe-3) : échange refusé, rematch initial conservé.
      const historiqueMatchs = [
        buildMatch({ id: 'm1', equipeAId: 'equipe-1', equipeBId: 'equipe-2', statut: 'termine', scoreA: 1, scoreB: 0 }),
        buildMatch({ id: 'm2', equipeAId: 'equipe-1', equipeBId: 'equipe-3', statut: 'termine', scoreA: 2, scoreB: 2 }),
      ];

      const result = service.genererAppariements(classement4(), [], historiqueMatchs);

      expect(result.paires).toEqual([
        ['equipe-1', 'equipe-2'],
        ['equipe-3', 'equipe-4'],
      ]);
    });

    it("accepte le rematch initial si l'échange créerait un nouveau rematch sur la paire suivante", () => {
      // equipe-1 vs equipe-2 déjà joué.
      // equipe-2 vs equipe-4 également déjà joué => l'échange créerait un nouveau rematch
      // sur la deuxième paire (equipe-2, equipe-4) : échange refusé, rematch initial conservé.
      const historiqueMatchs = [
        buildMatch({ id: 'm1', equipeAId: 'equipe-1', equipeBId: 'equipe-2', statut: 'termine', scoreA: 1, scoreB: 0 }),
        buildMatch({ id: 'm2', equipeAId: 'equipe-2', equipeBId: 'equipe-4', statut: 'termine', scoreA: 0, scoreB: 0 }),
      ];

      const result = service.genererAppariements(classement4(), [], historiqueMatchs);

      expect(result.paires).toEqual([
        ['equipe-1', 'equipe-2'],
        ['equipe-3', 'equipe-4'],
      ]);
    });

    it("accepte le rematch initial sans tenter d'échange s'il n'y a pas de paire suivante (dernière paire en conflit)", () => {
      // 4 équipes => 2 paires. La dernière paire (equipe-3, equipe-4) est un rematch,
      // mais il n'y a pas de paire i+1 : pas d'échange possible.
      const historiqueMatchs = [
        buildMatch({ id: 'm1', equipeAId: 'equipe-3', equipeBId: 'equipe-4', statut: 'termine', scoreA: 2, scoreB: 1 }),
      ];

      const result = service.genererAppariements(classement4(), [], historiqueMatchs);

      expect(result.paires).toEqual([
        ['equipe-1', 'equipe-2'],
        ['equipe-3', 'equipe-4'],
      ]);
    });

    it('ignore les matchs "estBye" (equipeBId null) dans la construction de l\'historique des confrontations', () => {
      // Le seul match historique est un bye d'equipe-1 : ne doit pas être interprété
      // comme une confrontation equipe-1 vs equipe-2.
      const historiqueMatchs = [
        buildMatch({ id: 'm1', equipeAId: 'equipe-1', equipeBId: null, estBye: true, statut: 'termine' }),
      ];

      const result = service.genererAppariements(classement4(), [], historiqueMatchs);

      expect(result.paires).toEqual([
        ['equipe-1', 'equipe-2'],
        ['equipe-3', 'equipe-4'],
      ]);
    });

    it('ne modifie pas les appariements quand aucune paire de base ne correspond à un match déjà joué', () => {
      const historiqueMatchs = [
        buildMatch({ id: 'm1', equipeAId: 'equipe-1', equipeBId: 'equipe-3', statut: 'termine', scoreA: 1, scoreB: 1 }),
      ];

      const result = service.genererAppariements(classement4(), [], historiqueMatchs);

      expect(result.paires).toEqual([
        ['equipe-1', 'equipe-2'],
        ['equipe-3', 'equipe-4'],
      ]);
    });
  });

  describe('paramètre historiqueMatchs optionnel', () => {
    it('produit le même résultat quand historiqueMatchs est omis ou passé comme tableau vide', () => {
      const resultOmis = service.genererAppariements(classement4(), []);
      const resultVide = service.genererAppariements(classement4(), [], []);

      expect(resultOmis).toEqual(resultVide);
      expect(resultOmis).toEqual({
        paires: [
          ['equipe-1', 'equipe-2'],
          ['equipe-3', 'equipe-4'],
        ],
        becotEquipeId: null,
      });
    });

    it("n'échoue pas quand historiqueMatchs est omis même si une paire de base correspondrait à un rematch (pas d'historique fourni = pas d'évitement)", () => {
      expect(() => service.genererAppariements(classement4(), [])).not.toThrow();
    });
  });

  describe('pureté — pas de mutation des arguments', () => {
    it('ne mute pas le tableau de classement ni ses entrées', () => {
      const classement = classement4();
      const classementCopie = JSON.parse(JSON.stringify(classement));

      service.genererAppariements(classement, []);

      expect(classement).toEqual(classementCopie);
    });

    it("ne mute pas le classement même dans le désordre", () => {
      const classementDesordonne = [
        buildClassementEntry({ equipeId: 'equipe-3', rang: 3 }),
        buildClassementEntry({ equipeId: 'equipe-1', rang: 1 }),
        buildClassementEntry({ equipeId: 'equipe-4', rang: 4 }),
        buildClassementEntry({ equipeId: 'equipe-2', rang: 2 }),
      ];
      const copie = JSON.parse(JSON.stringify(classementDesordonne));

      service.genererAppariements(classementDesordonne, []);

      expect(classementDesordonne).toEqual(copie);
    });

    it("ne mute pas equipesBecot", () => {
      const equipesBecot = ['equipe-5'];
      const classement5 = [
        ...classement4(),
        buildClassementEntry({ equipeId: 'equipe-5', rang: 5 }),
      ];

      service.genererAppariements(classement5, equipesBecot);

      expect(equipesBecot).toEqual(['equipe-5']);
    });

    it('ne mute pas historiqueMatchs ni ses éléments', () => {
      const historiqueMatchs = [
        buildMatch({ id: 'm1', equipeAId: 'equipe-1', equipeBId: 'equipe-2', statut: 'termine', scoreA: 1, scoreB: 0 }),
      ];
      const copie = JSON.parse(JSON.stringify(historiqueMatchs));

      service.genererAppariements(classement4(), [], historiqueMatchs);

      expect(historiqueMatchs).toEqual(copie);
    });
  });
});
