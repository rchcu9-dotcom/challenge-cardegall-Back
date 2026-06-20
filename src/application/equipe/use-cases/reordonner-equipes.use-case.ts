import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Equipe } from '../../../domain/equipe/entities/equipe.entity';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import { EQUIPE_REPOSITORY } from '../../../domain/shared/tokens';

@Injectable()
export class ReordonnerEquipesUseCase {
  constructor(@Inject(EQUIPE_REPOSITORY) private readonly equipes: EquipeRepository) {}

  async execute(orderedIds: string[]): Promise<Equipe[]> {
    const enrolees = await this.equipes.findEnroleesOrdered();
    const enroleesIds = new Set(enrolees.map((e) => e.id));

    const sameIds =
      orderedIds.length === enrolees.length && orderedIds.every((id) => enroleesIds.has(id));
    if (!sameIds) {
      throw new BadRequestException(
        'La liste fournie doit contenir exactement les identifiants des équipes enrôlées',
      );
    }

    await this.equipes.reorder(orderedIds);
    return this.equipes.findEnroleesOrdered();
  }
}
