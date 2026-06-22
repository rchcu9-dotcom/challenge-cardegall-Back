export type StatutEquipe = 'inscrite' | 'enrolee' | 'engagee' | 'retiree';

export interface Equipe {
  id: string;
  nom: string;
  capitaineUserId: string;
  /** Pseudo affiché du Capitaine, saisi à l'inscription. Absent pour les équipes seedées (fallback front sur capitaineUserId). */
  capitainePseudo?: string;
  /** Adresse mail du Capitaine, normalisée en minuscules. Absente pour les équipes seedées. */
  capitaineEmail?: string;
  nbJoueursApprox: number;
  nbFemininesEnvisage: number;
  commentaire?: string;
  statut: StatutEquipe;
  /** Renseigné lors de l'enrôlement (jour J). */
  nbFemininesReel?: number;
  /** Renseigné lors de l'enrôlement, réordonnable par glisser-déposer. */
  ordreArrivee?: number;
  /** ISO 8601 */
  dateInscription: string;
  /** ISO 8601 */
  dateEnrolement?: string;
}
