export type StatutPhaseFinale = 'en_cours' | 'terminee';

export interface PhaseFinale {
  id: string;
  /** Match id : 1er vs 4e du classement de poules. */
  demiFinaleAId: string;
  /** Match id : 2e vs 3e du classement de poules. */
  demiFinaleBId: string;
  /** Match id : finale "Cardebat" (vainqueurs des demi-finales), ou null si pas encore jouée. */
  finaleCardebatId: string | null;
  /** Match id : finale "Le Gall" (vaincus des demi-finales), ou null si pas encore jouée. */
  finaleLeGallId: string | null;
  statut: StatutPhaseFinale;
}
