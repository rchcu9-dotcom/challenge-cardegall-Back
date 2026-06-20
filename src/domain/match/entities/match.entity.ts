export type StatutMatch = 'a_jouer' | 'en_cours' | 'termine';

export interface Match {
  id: string;
  tourId: string;
  equipeAId: string;
  /** null si ce match est un "bye"/Becot pour equipeAId. */
  equipeBId: string | null;
  estBye: boolean;
  terrain: string | null;
  /** ISO 8601 */
  heureDebutPrevue: string | null;
  /** ISO 8601 */
  heureFinPrevue: string | null;
  scoreA: number | null;
  scoreB: number | null;
  statut: StatutMatch;
}
