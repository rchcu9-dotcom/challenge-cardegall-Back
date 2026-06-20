import { Equipe } from '../../equipe/entities/equipe.entity';
import { Match } from '../../match/entities/match.entity';
import { ClassementEntry } from '../entities/classement-entry.entity';

export interface ClassementService {
  /**
   * Calcule le classement courant à partir des équipes engagées et des matchs joués.
   * Applique les points (3/1/0) puis les critères de départage dans l'ordre de
   * ORDRE_CRITERES_DEPARTAGE. Implémentation à fournir par la spec
   * `saisie-resultats-classement`.
   */
  calculer(equipes: Equipe[], matches: Match[]): ClassementEntry[];
}
