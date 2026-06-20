import {
  ParametresTour,
  StatutTour,
  Tour,
} from '../../../domain/tour/entities/tour.entity';

export interface TourDto {
  id: string;
  numero: number;
  statut: StatutTour;
  parametres: ParametresTour;
  equipesBecot: string[];
}

export function toTourDto(tour: Tour): TourDto {
  return { ...tour };
}
