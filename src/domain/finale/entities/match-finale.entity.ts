export type TypeMatchFinale = 'demi_finale_a' | 'demi_finale_b' | 'finale_cardebat' | 'finale_le_gall';
export type StatutMatchFinale = 'a_jouer' | 'termine';

export interface MatchFinale {
  id: string;
  type: TypeMatchFinale;
  /** null si l'équipe n'est pas encore déterminée (finales, avant la fin des demi-finales). */
  equipeAId: string | null;
  equipeBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  statut: StatutMatchFinale;
}
