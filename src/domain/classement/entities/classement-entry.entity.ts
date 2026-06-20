/**
 * Critères de départage en cas d'égalité de points, dans l'ordre d'application.
 * - diffParticuliere : différence de buts dans les confrontations directes entre équipes à égalité
 * - diffGenerale : différence de buts sur l'ensemble du tournoi
 * - butsMarques : meilleure attaque (total de buts marqués)
 * - nbFeminines : nombre de féminines de l'équipe
 */
export type CritereDepartage = 'diffParticuliere' | 'diffGenerale' | 'butsMarques' | 'nbFeminines';

export const ORDRE_CRITERES_DEPARTAGE: CritereDepartage[] = [
  'diffParticuliere',
  'diffGenerale',
  'butsMarques',
  'nbFeminines',
];

export interface ClassementEntry {
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
