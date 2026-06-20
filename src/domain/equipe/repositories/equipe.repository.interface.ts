import { Repository } from '../../shared/repositories/repository.interface';
import { Equipe } from '../entities/equipe.entity';

export interface EquipeRepository extends Repository<Equipe> {
  findEnroleesOrdered(): Promise<Equipe[]>;
  reorder(orderedIds: string[]): Promise<void>;
}
