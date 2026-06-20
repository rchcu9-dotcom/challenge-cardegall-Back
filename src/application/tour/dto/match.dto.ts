import {
  Match,
  StatutMatch,
} from '../../../domain/match/entities/match.entity';

export interface MatchDto {
  id: string;
  tourId: string;
  equipeAId: string;
  equipeBId: string | null;
  estBye: boolean;
  terrain: string | null;
  heureDebutPrevue: string | null;
  heureFinPrevue: string | null;
  scoreA: number | null;
  scoreB: number | null;
  statut: StatutMatch;
}

export function toMatchDto(match: Match): MatchDto {
  return { ...match };
}
