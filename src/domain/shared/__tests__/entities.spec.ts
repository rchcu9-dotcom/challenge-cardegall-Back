import { Equipe, StatutEquipe } from '../../equipe/entities/equipe.entity';
import { Tour, ParametresTour, StatutTour } from '../../tour/entities/tour.entity';
import { Match, StatutMatch } from '../../match/entities/match.entity';
import {
  ClassementEntry,
  CritereDepartage,
  ORDRE_CRITERES_DEPARTAGE,
} from '../../classement/entities/classement-entry.entity';
import { PhaseFinale, StatutPhaseFinale } from '../../finale/entities/phase-finale.entity';

describe('Domaine partagé — entités', () => {
  it("Equipe couvre le cycle de vie inscription -> enrôlement -> engagement", () => {
    const statutsValides: StatutEquipe[] = ['inscrite', 'enrolee', 'engagee', 'retiree'];
    const equipe: Equipe = {
      id: 'equipe-1',
      nom: 'Les Foudres',
      capitaineUserId: 'user-1',
      nbJoueursApprox: 10,
      nbFemininesEnvisage: 3,
      statut: 'enrolee',
      nbFemininesReel: 2,
      ordreArrivee: 1,
      dateInscription: '2026-06-01T08:00:00.000Z',
      dateEnrolement: '2026-06-13T07:30:00.000Z',
    };

    expect(statutsValides).toContain(equipe.statut);
    expect(equipe.commentaire).toBeUndefined();
    expect(equipe.nbFemininesReel).toBeGreaterThanOrEqual(0);
  });

  it('ParametresTour porte terrains, durée de match, latence et délai de démarrage', () => {
    const parametres: ParametresTour = {
      nomsTerrains: ['A', 'B', 'C'],
      dureeMatchMinutes: 12,
      latenceMinutes: 3,
      delaiDemarrageMinutes: 3,
    };

    expect(parametres.nomsTerrains).toEqual(['A', 'B', 'C']);
    expect(parametres.delaiDemarrageMinutes).toBe(3);
  });

  it("Tour porte son numéro, ses paramètres et l'historique des équipes bye/Becot", () => {
    const statutsValides: StatutTour[] = ['planifie', 'en_cours', 'termine'];
    const tour: Tour = {
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
    };

    expect(statutsValides).toContain(tour.statut);
    expect(tour.equipesBecot).toEqual([]);
  });

  it('Match représente un match joué (deux équipes) ou un bye/Becot (equipeBId nul)', () => {
    const statutsValides: StatutMatch[] = ['a_jouer', 'en_cours', 'termine'];
    const matchJoue: Match = {
      id: 'match-1',
      tourId: 'tour-1',
      equipeAId: 'equipe-1',
      equipeBId: 'equipe-2',
      estBye: false,
      terrain: 'A',
      heureDebutPrevue: '2026-06-13T08:00:00.000Z',
      heureFinPrevue: '2026-06-13T08:12:00.000Z',
      scoreA: 3,
      scoreB: 1,
      statut: 'termine',
    };
    const matchBye: Match = {
      id: 'match-2',
      tourId: 'tour-1',
      equipeAId: 'equipe-3',
      equipeBId: null,
      estBye: true,
      terrain: null,
      heureDebutPrevue: null,
      heureFinPrevue: null,
      scoreA: null,
      scoreB: null,
      statut: 'termine',
    };

    expect(statutsValides).toContain(matchJoue.statut);
    expect(matchBye.equipeBId).toBeNull();
    expect(matchBye.estBye).toBe(true);
  });

  it("ORDRE_CRITERES_DEPARTAGE applique les critères dans l'ordre métier défini par la spec", () => {
    const ordreAttendu: CritereDepartage[] = [
      'diffParticuliere',
      'diffGenerale',
      'butsMarques',
      'nbFeminines',
    ];

    expect(ORDRE_CRITERES_DEPARTAGE).toEqual(ordreAttendu);
  });

  it('ClassementEntry porte un compteur pour chaque critère de départage', () => {
    const entry: ClassementEntry = {
      equipeId: 'equipe-1',
      points: 9,
      victoires: 3,
      nuls: 0,
      defaites: 0,
      butsMarques: 12,
      butsConcedes: 2,
      diffGenerale: 10,
      diffParticuliere: 2,
      nbFeminines: 3,
      rang: 1,
    };

    for (const critere of ORDRE_CRITERES_DEPARTAGE) {
      expect(entry).toHaveProperty(critere);
    }
  });

  it('PhaseFinale référence les demi-finales et les finales Cardebat / Le Gall', () => {
    const statutsValides: StatutPhaseFinale[] = ['en_cours', 'terminee'];
    const phase: PhaseFinale = {
      id: 'phase-1',
      demiFinaleAId: 'match-10',
      demiFinaleBId: 'match-11',
      finaleCardebatId: null,
      finaleLeGallId: null,
      statut: 'en_cours',
    };

    expect(statutsValides).toContain(phase.statut);
    expect(phase.finaleCardebatId).toBeNull();
    expect(phase.finaleLeGallId).toBeNull();
  });
});
