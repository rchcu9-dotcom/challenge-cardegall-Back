import { Injectable } from '@nestjs/common';
import { Match } from '../../match/entities/match.entity';
import { ParametresTour } from '../../tour/entities/tour.entity';
import { PlanningService } from './planning.service';

/**
 * Implémentation naïve de `PlanningService` : assignation des terrains par
 * round-robin (index du match modulo nombre de terrains) et file "prochaine
 * heure libre" par terrain. Le 1er match d'un terrain démarre à
 * `maintenant + delaiDemarrageMinutes`, les suivants démarrent à la fin du
 * match précédent sur ce terrain + `latenceMinutes`.
 */
@Injectable()
export class PlanningNaiveService implements PlanningService {
  calculerHoraires(
    matches: Match[],
    parametres: ParametresTour,
    maintenant: Date,
  ): Match[] {
    const debut = new Date(
      maintenant.getTime() + parametres.delaiDemarrageMinutes * 60_000,
    );
    const finsParTerrain = new Map<string, Date>();

    return matches.map((match, index) => {
      const terrain =
        parametres.nomsTerrains[index % parametres.nomsTerrains.length];
      const { match: planifie, finPrevue } = this.chainerMatch(
        match,
        terrain,
        finsParTerrain.get(terrain) ?? debut,
        parametres,
      );
      finsParTerrain.set(terrain, finPrevue);
      return planifie;
    });
  }

  recalculerHorairesManuel(
    matchesParTerrain: Record<string, Match[]>,
    ancrePartTerrain: Record<string, Date | null>,
    parametres: ParametresTour,
    maintenant: Date,
  ): Match[] {
    const debutParDefaut = new Date(
      maintenant.getTime() + parametres.delaiDemarrageMinutes * 60_000,
    );
    const resultat: Match[] = [];

    for (const [terrain, matches] of Object.entries(matchesParTerrain)) {
      let prochaineHeureLibre = ancrePartTerrain[terrain] ?? debutParDefaut;

      for (const match of matches) {
        const { match: planifie, finPrevue } = this.chainerMatch(
          match,
          terrain,
          prochaineHeureLibre,
          parametres,
        );
        resultat.push(planifie);
        prochaineHeureLibre = finPrevue;
      }
    }

    return resultat;
  }

  /** Date/heure de fin prévue à utiliser comme point de départ du match suivant sur ce terrain. */
  private chainerMatch(
    match: Match,
    terrain: string,
    heureDebut: Date,
    parametres: ParametresTour,
  ): { match: Match; finPrevue: Date } {
    const heureFin = new Date(
      heureDebut.getTime() + parametres.dureeMatchMinutes * 60_000,
    );

    return {
      match: {
        ...match,
        terrain,
        heureDebutPrevue: heureDebut.toISOString(),
        heureFinPrevue: heureFin.toISOString(),
      },
      finPrevue: new Date(
        heureFin.getTime() + parametres.latenceMinutes * 60_000,
      ),
    };
  }
}
