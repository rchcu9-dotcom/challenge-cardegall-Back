import { Type } from 'class-transformer';
import { IsIn, IsOptional, ValidateNested } from 'class-validator';
import { ClassementEntryDto } from './classement-entry.dto';
import { MatchDto } from './match.dto';
import { ParametresTourDto } from './parametres-tour.dto';
import { TourDto } from './tour.dto';

export type ActionFinTour = 'nouveau_tour' | 'phase_finale';

export class TerminerTourDto {
  @IsIn(['nouveau_tour', 'phase_finale'])
  action: ActionFinTour;

  /** Paramètres du tour suivant (action `nouveau_tour`). Si absent, copie des paramètres du tour courant. */
  @IsOptional()
  @ValidateNested()
  @Type(() => ParametresTourDto)
  parametres?: ParametresTourDto;
}

export type TerminerTourResultDto =
  | { action: 'nouveau_tour'; tour: TourDto; matches: MatchDto[] }
  | {
      action: 'phase_finale';
      classementFinal: ClassementEntryDto[];
      /** true si les demi-finales ont été créées (≥ 4 équipes au classement final) ; sinon, à démarrer manuellement depuis /admin/finale une fois possible. */
      phaseFinaleDemarree: boolean;
    };
