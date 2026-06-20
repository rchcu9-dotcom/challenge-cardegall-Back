import { StatutPhaseFinale } from '../../../domain/finale/entities/phase-finale.entity';
import { MatchFinaleDto } from './match-finale.dto';

export interface PhaseFinaleDto {
  demarree: boolean;
  statut: StatutPhaseFinale | null;
  demiFinaleA: MatchFinaleDto | null;
  demiFinaleB: MatchFinaleDto | null;
  finaleCardebat: MatchFinaleDto | null;
  finaleLeGall: MatchFinaleDto | null;
}
