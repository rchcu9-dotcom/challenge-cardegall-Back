import { ClockPort } from '../ports/clock.port';
import {
  AppariementService,
  AppariementResult,
} from '../../tour/services/appariement.service';
import { ClassementEntry } from '../../classement/entities/classement-entry.entity';
import { ClassementService } from '../../classement/services/classement.service';
import { Equipe } from '../../equipe/entities/equipe.entity';
import { Match } from '../../match/entities/match.entity';
import { PlanningService } from '../../planning/services/planning.service';
import { ParametresTour } from '../../tour/entities/tour.entity';

/**
 * Implémentations de test minimales : elles vérifient que les signatures des
 * interfaces de service sont implémentables et utilisables, sans préjuger des
 * règles métier réelles (cf. track.md — bloquées tant que les ambiguïtés
 * bye/Becot et goal average ne sont pas levées avec Lionel).
 */

class FixedClock implements ClockPort {
  constructor(private readonly date: Date) {}

  now(): Date {
    return this.date;
  }
}

class NaiveAppariementService implements AppariementService {
  genererAppariements(classement: ClassementEntry[]): AppariementResult {
    const idsTries = classement.map((entry) => entry.equipeId);

    let becotEquipeId: string | null = null;
    let candidats = idsTries;
    if (idsTries.length % 2 === 1) {
      becotEquipeId = idsTries[idsTries.length - 1];
      candidats = idsTries.slice(0, -1);
    }

    const paires: Array<[string, string]> = [];
    for (let i = 0; i < candidats.length; i += 2) {
      paires.push([candidats[i], candidats[i + 1]]);
    }

    return { paires, becotEquipeId };
  }
}

class NaiveClassementService implements ClassementService {
  calculer(equipes: Equipe[], matches: Match[]): ClassementEntry[] {
    return equipes.map((equipe) => {
      const matchsEquipe = matches.filter(
        (m) => m.statut === 'termine' && (m.equipeAId === equipe.id || m.equipeBId === equipe.id),
      );

      let points = 0;
      let victoires = 0;
      let nuls = 0;
      let defaites = 0;
      let butsMarques = 0;
      let butsConcedes = 0;

      for (const m of matchsEquipe) {
        const estA = m.equipeAId === equipe.id;
        const buts = (estA ? m.scoreA : m.scoreB) ?? 0;
        const butsAdv = (estA ? m.scoreB : m.scoreA) ?? 0;

        butsMarques += buts;
        butsConcedes += butsAdv;

        if (buts > butsAdv) {
          points += 3;
          victoires += 1;
        } else if (buts === butsAdv) {
          points += 1;
          nuls += 1;
        } else {
          defaites += 1;
        }
      }

      return {
        equipeId: equipe.id,
        points,
        victoires,
        nuls,
        defaites,
        butsMarques,
        butsConcedes,
        diffGenerale: butsMarques - butsConcedes,
        diffParticuliere: 0,
        nbFeminines: equipe.nbFemininesReel ?? equipe.nbFemininesEnvisage,
        rang: 0,
      };
    });
  }
}

class NaivePlanningService implements PlanningService {
  calculerHoraires(matches: Match[], parametres: ParametresTour, maintenant: Date): Match[] {
    const debut = new Date(maintenant.getTime() + parametres.delaiDemarrageMinutes * 60_000);
    const finsParTerrain = new Map<string, Date>();

    return matches.map((match, index) => {
      const terrain = parametres.nomsTerrains[index % parametres.nomsTerrains.length];
      const heureDebut = finsParTerrain.get(terrain) ?? debut;
      const heureFin = new Date(heureDebut.getTime() + parametres.dureeMatchMinutes * 60_000);

      finsParTerrain.set(
        terrain,
        new Date(heureFin.getTime() + parametres.latenceMinutes * 60_000),
      );

      return {
        ...match,
        terrain,
        heureDebutPrevue: heureDebut.toISOString(),
        heureFinPrevue: heureFin.toISOString(),
      };
    });
  }
}

function equipe(overrides: Partial<Equipe>): Equipe {
  return {
    id: 'equipe-x',
    nom: 'Équipe X',
    capitaineUserId: 'user-x',
    nbJoueursApprox: 8,
    nbFemininesEnvisage: 2,
    statut: 'engagee',
    dateInscription: '2026-06-01T08:00:00.000Z',
    ...overrides,
  };
}

function classementEntry(overrides: Partial<ClassementEntry>): ClassementEntry {
  return {
    equipeId: 'equipe-x',
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

describe('Domaine partagé — interfaces de service (implémentations de test)', () => {
  it('ClockPort : now() renvoie une date contrôlée', () => {
    const date = new Date('2026-06-13T07:57:00.000Z');
    const clock: ClockPort = new FixedClock(date);

    expect(clock.now()).toBe(date);
  });

  it('AppariementService : nombre pair -> paires 1v2/3v4, aucun bye', () => {
    const service: AppariementService = new NaiveAppariementService();
    const classement = ['e1', 'e2', 'e3', 'e4'].map((id, i) =>
      classementEntry({ equipeId: id, rang: i + 1 }),
    );

    const result = service.genererAppariements(classement, []);

    expect(result.paires).toEqual([
      ['e1', 'e2'],
      ['e3', 'e4'],
    ]);
    expect(result.becotEquipeId).toBeNull();
  });

  it('AppariementService : nombre impair -> la dernière équipe du classement devient bye/Becot', () => {
    const service: AppariementService = new NaiveAppariementService();
    const classement = ['e1', 'e2', 'e3', 'e4', 'e5'].map((id, i) =>
      classementEntry({ equipeId: id, rang: i + 1 }),
    );

    const result = service.genererAppariements(classement, []);

    expect(result.becotEquipeId).toBe('e5');
    expect(result.paires).toEqual([
      ['e1', 'e2'],
      ['e3', 'e4'],
    ]);
  });

  it('ClassementService : applique 3/1/0 points sur des matchs terminés', () => {
    const service: ClassementService = new NaiveClassementService();
    const equipes = [equipe({ id: 'e1' }), equipe({ id: 'e2' })];
    const matches: Match[] = [
      {
        id: 'match-1',
        tourId: 'tour-1',
        equipeAId: 'e1',
        equipeBId: 'e2',
        estBye: false,
        terrain: 'A',
        heureDebutPrevue: null,
        heureFinPrevue: null,
        scoreA: 2,
        scoreB: 1,
        statut: 'termine',
      },
    ];

    const classement = service.calculer(equipes, matches);
    const e1 = classement.find((c) => c.equipeId === 'e1');
    const e2 = classement.find((c) => c.equipeId === 'e2');

    expect(e1).toMatchObject({ points: 3, victoires: 1, butsMarques: 2, butsConcedes: 1 });
    expect(e2).toMatchObject({ points: 0, defaites: 1, butsMarques: 1, butsConcedes: 2 });
  });

  it('PlanningService : calcule terrain et horaires à partir du délai de démarrage paramétré', () => {
    const service: PlanningService = new NaivePlanningService();
    const parametres: ParametresTour = {
      nomsTerrains: ['A', 'B'],
      dureeMatchMinutes: 10,
      latenceMinutes: 2,
      delaiDemarrageMinutes: 3,
    };
    const maintenant = new Date('2026-06-13T08:00:00.000Z');
    const matches: Match[] = [
      {
        id: 'match-1',
        tourId: 'tour-1',
        equipeAId: 'e1',
        equipeBId: 'e2',
        estBye: false,
        terrain: null,
        heureDebutPrevue: null,
        heureFinPrevue: null,
        scoreA: null,
        scoreB: null,
        statut: 'a_jouer',
      },
    ];

    const [planifie] = service.calculerHoraires(matches, parametres, maintenant);

    expect(planifie.terrain).toBe('A');
    expect(planifie.heureDebutPrevue).toBe('2026-06-13T08:03:00.000Z');
    expect(planifie.heureFinPrevue).toBe('2026-06-13T08:13:00.000Z');
  });
});
