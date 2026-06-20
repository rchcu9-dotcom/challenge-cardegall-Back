import { Repository } from '../../shared/repositories/repository.interface';
import { Tour } from '../entities/tour.entity';

export interface TourRepository extends Repository<Tour> {
  findCurrent(): Promise<Tour | null>;
  /** Utilisé pour préremplir les paramètres du tour suivant. */
  findLast(): Promise<Tour | null>;
}
