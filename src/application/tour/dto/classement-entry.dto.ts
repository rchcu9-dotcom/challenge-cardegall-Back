import { ClassementEntry } from '../../../domain/classement/entities/classement-entry.entity';

export interface ClassementEntryDto {
  equipeId: string;
  points: number;
  victoires: number;
  nuls: number;
  defaites: number;
  butsMarques: number;
  butsConcedes: number;
  diffGenerale: number;
  diffParticuliere: number;
  nbFeminines: number;
  rang: number;
}

export function toClassementEntryDto(entry: ClassementEntry): ClassementEntryDto {
  return { ...entry };
}
