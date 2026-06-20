import { Inject, Injectable } from '@nestjs/common';
import type { MatchFinaleRepository } from '../../../domain/finale/repositories/match-finale.repository.interface';
import type { PhaseFinaleRepository } from '../../../domain/finale/repositories/phase-finale.repository.interface';
import { MATCH_FINALE_REPOSITORY, PHASE_FINALE_REPOSITORY } from '../../../domain/shared/tokens';
import { toMatchFinaleDto } from '../dto/match-finale.dto';
import { PhaseFinaleDto } from '../dto/phase-finale.dto';

@Injectable()
export class ObtenirPhaseFinaleUseCase {
  constructor(
    @Inject(PHASE_FINALE_REPOSITORY) private readonly phaseFinaleRepository: PhaseFinaleRepository,
    @Inject(MATCH_FINALE_REPOSITORY) private readonly matchFinaleRepository: MatchFinaleRepository,
  ) {}

  async execute(): Promise<PhaseFinaleDto> {
    const phaseFinale = await this.phaseFinaleRepository.obtenir();
    if (!phaseFinale) {
      return {
        demarree: false,
        statut: null,
        demiFinaleA: null,
        demiFinaleB: null,
        finaleCardebat: null,
        finaleLeGall: null,
      };
    }

    const [demiFinaleA, demiFinaleB, finaleCardebat, finaleLeGall] = await Promise.all([
      this.matchFinaleRepository.findById(phaseFinale.demiFinaleAId),
      this.matchFinaleRepository.findById(phaseFinale.demiFinaleBId),
      phaseFinale.finaleCardebatId
        ? this.matchFinaleRepository.findById(phaseFinale.finaleCardebatId)
        : Promise.resolve(null),
      phaseFinale.finaleLeGallId
        ? this.matchFinaleRepository.findById(phaseFinale.finaleLeGallId)
        : Promise.resolve(null),
    ]);

    return {
      demarree: true,
      statut: phaseFinale.statut,
      demiFinaleA: demiFinaleA ? toMatchFinaleDto(demiFinaleA) : null,
      demiFinaleB: demiFinaleB ? toMatchFinaleDto(demiFinaleB) : null,
      finaleCardebat: finaleCardebat ? toMatchFinaleDto(finaleCardebat) : null,
      finaleLeGall: finaleLeGall ? toMatchFinaleDto(finaleLeGall) : null,
    };
  }
}
