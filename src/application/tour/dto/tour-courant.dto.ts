import { ClassementEntryDto } from './classement-entry.dto';
import { MatchDto } from './match.dto';
import { TourDto } from './tour.dto';

export interface TourCourantDto {
  tour: TourDto;
  matches: MatchDto[];
  /** Tous les matchs du tournoi (tous tours confondus) — utilisé pour l'affichage des résultats complets. */
  tousLesMatchs: MatchDto[];
  classement: ClassementEntryDto[];
  /** true si tous les matchs du tour sont `termine` (ou `estBye`) — conditionne l'affichage des actions de fin de tour. */
  resultatsComplets: boolean;
}
