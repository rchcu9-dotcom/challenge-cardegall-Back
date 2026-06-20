export type StatutTour = 'planifie' | 'en_cours' | 'termine';

export interface ParametresTour {
  /** Noms des terrains disponibles, ex. ['A', 'B', 'C']. */
  nomsTerrains: string[];
  dureeMatchMinutes: number;
  latenceMinutes: number;
  /** Délai avant le premier match d'un terrain (défaut : 3 minutes). */
  delaiDemarrageMinutes: number;
}

export interface Tour {
  id: string;
  numero: number;
  statut: StatutTour;
  parametres: ParametresTour;
  /** Historique cumulé des equipeId déjà désignées "bye"/Becot (rotation). */
  equipesBecot: string[];
}
