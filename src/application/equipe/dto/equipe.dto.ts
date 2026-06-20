import {
  Equipe,
  StatutEquipe,
} from '../../../domain/equipe/entities/equipe.entity';

export interface EquipeDto {
  id: string;
  nom: string;
  capitaineUserId: string;
  capitainePseudo?: string;
  nbJoueursApprox: number;
  nbFemininesEnvisage: number;
  commentaire?: string;
  statut: StatutEquipe;
  nbFemininesReel?: number;
  ordreArrivee?: number;
  dateInscription: string;
  dateEnrolement?: string;
}

export function toEquipeDto(equipe: Equipe): EquipeDto {
  return { ...equipe };
}
