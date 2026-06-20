import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Equipe } from '../../../domain/equipe/entities/equipe.entity';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import type { ClockPort } from '../../../domain/shared/ports/clock.port';
import { CLOCK, EQUIPE_REPOSITORY } from '../../../domain/shared/tokens';
import { EnrolerEquipeDto } from '../dto/enroler-equipe.dto';

@Injectable()
export class EnrolerEquipeUseCase {
  constructor(
    @Inject(EQUIPE_REPOSITORY) private readonly equipes: EquipeRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(equipeId: string, dto: EnrolerEquipeDto): Promise<Equipe> {
    const equipe = await this.equipes.findById(equipeId);
    if (!equipe) {
      throw new NotFoundException(`Équipe ${equipeId} introuvable`);
    }
    if (equipe.statut !== 'inscrite') {
      throw new ConflictException(`L'équipe ${equipeId} n'est pas au statut "inscrite"`);
    }

    const enrolees = await this.equipes.findEnroleesOrdered();
    const ordreArrivee =
      enrolees.length > 0 ? Math.max(...enrolees.map((e) => e.ordreArrivee ?? 0)) + 1 : 1;

    return this.equipes.save({
      ...equipe,
      statut: 'enrolee',
      nbFemininesReel: dto.nbFemininesReel,
      ordreArrivee,
      dateEnrolement: this.clock.now().toISOString(),
    });
  }
}
