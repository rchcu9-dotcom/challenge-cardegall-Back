import { ClassementEntry } from '../../classement/entities/classement-entry.entity';
import { Match } from '../../match/entities/match.entity';

export interface AppariementResult {
  /** Paires [equipeAId, equipeBId] formées par rang de classement (1v2, 3v4, ...). */
  paires: Array<[string, string]>;
  /** equipeId désignée "bye"/Becot pour ce tour, ou null si nombre pair d'équipes. */
  becotEquipeId: string | null;
}

export interface AppariementService {
  /**
   * Génère les appariements d'un tour à partir du classement courant, de
   * l'historique des équipes déjà désignées "bye"/Becot (rotation), et
   * optionnellement de l'historique complet des matchs déjà joués (évitement de
   * rematchs).
   *
   * `historiqueMatchs` est optionnel pour préserver la compatibilité de signature
   * avec les implémentations et tests existants qui appellent la méthode avec
   * 2 arguments.
   */
  genererAppariements(
    classement: ClassementEntry[],
    equipesBecot: string[],
    historiqueMatchs?: Match[],
  ): AppariementResult;
}
