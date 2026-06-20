import {
  MatchFinale,
  StatutMatchFinale,
  TypeMatchFinale,
} from '../../../domain/finale/entities/match-finale.entity';

export interface MatchFinaleDto {
  id: string;
  type: TypeMatchFinale;
  equipeAId: string | null;
  equipeBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  statut: StatutMatchFinale;
}

export function toMatchFinaleDto(entity: MatchFinale): MatchFinaleDto {
  return { ...entity };
}
