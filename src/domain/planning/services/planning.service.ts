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
}
