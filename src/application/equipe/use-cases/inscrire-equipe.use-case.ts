import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Equipe } from '../../../domain/equipe/entities/equipe.entity';
import type { EnrolementStateRepository } from '../../../domain/equipe/repositories/enrolement-state.repository.interface';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import type { ClockPort } from '../../../domain/shared/ports/clock.port';
import {
  CLOCK,
  ENROLEMENT_STATE_REPOSITORY,
  EQUIPE_REPOSITORY,
} from '../../../domain/shared/tokens';
import { InscrireEquipeDto } from '../dto/inscrire-equipe.dto';

@Injectable()
export class InscrireEquipeUseCase {
  constructor(
    @Inject(EQUIPE_REPOSITORY) private readonly equipes: EquipeRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(ENROLEMENT_STATE_REPOSITORY)
    private readonly enrolementState: EnrolementStateRepository,
  ) {}

  async execute(dto: InscrireEquipeDto): Promise<Equipe> {
    if (await this.enrolementState.isCloture()) {
      throw new BadRequestException(
        'Les enrôlements sont clôturés, inscription impossible',
      );
    }

    const equipe: Equipe = {
      id: randomUUID(),
      nom: dto.nom,
      capitaineUserId: dto.capitaineUserId,
      capitainePseudo: dto.capitainePseudo,
      nbJoueursApprox: dto.nbJoueursApprox,
      nbFemininesEnvisage: dto.nbFemininesEnvisage,
      commentaire: dto.commentaire,
      statut: 'inscrite',
      dateInscription: this.clock.now().toISOString(),
    };
    return this.equipes.save(equipe);
  }
}
