import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ClassementEntry } from '../../classement/entities/classement-entry.entity';
import { Equipe } from '../../equipe/entities/equipe.entity';
import { Match } from '../../match/entities/match.entity';
import type { PlanningService } from '../../planning/services/planning.service';
import { APPARIEMENT_SERVICE, PLANNING_SERVICE } from '../../shared/tokens';
import { ParametresTour, Tour } from '../entities/tour.entity';
import type { AppariementService } from './appariement.service';

export const PARAMETRES_PREMIER_TOUR: ParametresTour = {
  nomsTerrains: ['A', 'B'],
  dureeMatchMinutes: 10,
  latenceMinutes: 2,
  delaiDemarrageMinutes: 3,
};

export interface ConstruirePremierTourParams {
  /** Équipes engagées pour ce tour, déjà triées (ordreArrivee asc) ; rang = index + 1. */
  equipesEngagees: Equipe[];
  parametres: ParametresTour;
  maintenant: Date;
}

export interface PremierTourResult {
  tour: Tour;
  matches: Match[];
}

@Injectable()
export class PremierTourService {
  constructor(
    @Inject(APPARIEMENT_SERVICE)
    private readonly appariementService: AppariementService,
    @Inject(PLANNING_SERVICE) private readonly planningService: PlanningService,
  ) {}

  construire(params: ConstruirePremierTourParams): PremierTourResult {
    const { equipesEngagees, parametres, maintenant } = params;

    const classementInitial: ClassementEntry[] = equipesEngagees.map(
      (equipe, index) => ({
        equipeId: equipe.id,
        points: 0,
        victoires: 0,
        nuls: 0,
        defaites: 0,
        butsMarques: 0,
        butsConcedes: 0,
        diffGenerale: 0,
        diffParticuliere: 0,
        nbFeminines: equipe.nbFemininesReel ?? equipe.nbFemininesEnvisage,
        rang: index + 1,
      }),
    );

    const { paires, becotEquipeId } =
      this.appariementService.genererAppariements(classementInitial, [], []);

    const nouveauTourId = randomUUID();
    const tour: Tour = {
      id: nouveauTourId,
      numero: 1,
      statut: 'en_cours',
      parametres,
      equipesBecot: becotEquipeId ? [becotEquipeId] : [],
    };

    const matchesAppairesSansHoraire: Match[] = paires.map(
      ([equipeAId, equipeBId]) => ({
        id: randomUUID(),
        tourId: nouveauTourId,
        equipeAId,
        equipeBId,
        estBye: false,
        terrain: null,
        heureDebutPrevue: null,
        heureFinPrevue: null,
        scoreA: null,
        scoreB: null,
        statut: 'a_jouer' as const,
      }),
    );

    const matchesPlanifies = this.planningService.calculerHoraires(
      matchesAppairesSansHoraire,
      parametres,
      maintenant,
    );

    const matches: Match[] = [...matchesPlanifies];

    if (becotEquipeId) {
      matches.push({
        id: randomUUID(),
        tourId: nouveauTourId,
        equipeAId: becotEquipeId,
        equipeBId: null,
        estBye: true,
        terrain: null,
        heureDebutPrevue: null,
        heureFinPrevue: null,
        scoreA: null,
        scoreB: null,
        statut: 'termine' as const,
      });
    }

    return { tour, matches };
  }
}
