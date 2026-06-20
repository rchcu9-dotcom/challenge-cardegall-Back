import { Repository } from '../../shared/repositories/repository.interface';
import { Match } from '../entities/match.entity';

export interface MatchRepository extends Repository<Match> {
  findByTour(tourId: string): Promise<Match[]>;
  saveMany(matches: Match[]): Promise<Match[]>;
}
