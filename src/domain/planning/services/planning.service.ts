import { Match } from '../../match/entities/match.entity';
import { ParametresTour } from '../../tour/entities/tour.entity';

export interface PlanningService {
  /**
   * Calcule terrain et horaires (heureDebutPrevue/heureFinPrevue) pour chaque match
   * d'un tour, à partir des paramètres du tour et de l'heure courante. Implémentation
   * à fournir par la spec `planning-terrains`.
   */
  calculerHoraires(
    matches: Match[],
    parametres: ParametresTour,
    maintenant: Date,
  ): Match[];

  /**
   * Recalcule heureDebutPrevue/heureFinPrevue d'une disposition déjà fixée manuellement
   * (terrain + ordre imposés par l'admin via glisser-déposer, cf. spec
   * `le-tournoi-nest-lanc-que-lorque-lenrollement-des-quipes-est-`), sans réassigner aucun
   * terrain (à la différence de `calculerHoraires`, qui assigne par round-robin).
   *
   * Pour chaque terrain, la chaîne démarre après `ancrePartTerrain[terrain]` (heureFinPrevue
   * du dernier match déjà figé sur ce terrain) si renseigné, sinon selon la même règle que
   * `calculerHoraires` (maintenant + delaiDemarrageMinutes).
   */
  recalculerHorairesManuel(
    matchesParTerrain: Record<string, Match[]>,
    ancrePartTerrain: Record<string, Date | null>,
    parametres: ParametresTour,
    maintenant: Date,
  ): Match[];
}
