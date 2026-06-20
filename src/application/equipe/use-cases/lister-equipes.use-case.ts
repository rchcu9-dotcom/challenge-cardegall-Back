import { Inject, Injectable } from '@nestjs/common';
import { Equipe } from '../../../domain/equipe/entities/equipe.entity';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import { EQUIPE_REPOSITORY } from '../../../domain/shared/tokens';

@Injectable()
export class ListerEquipesUseCase {
  constructor(@Inject(EQUIPE_REPOSITORY) private readonly equipes: EquipeRepository) {}

  async execute(): Promise<Equipe[]> {
    return this.equipes.findAll();
  }
}
