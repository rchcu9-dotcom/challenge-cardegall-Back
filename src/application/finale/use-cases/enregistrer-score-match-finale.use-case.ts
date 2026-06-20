import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MatchFinale } from '../../../domain/finale/entities/match-finale.entity';
import { PhaseFinaleService } from '../../../domain/finale/services/phase-finale.service';
import type { MatchFinaleRepository } from '../../../domain/finale/repositories/match-finale.repository.interface';
import type { PhaseFinaleRepository } from '../../../domain/finale/repositories/phase-finale.repository.interface';
import { MATCH_FINALE_REPOSITORY, PHASE_FINALE_REPOSITORY } from '../../../domain/shared/tokens';
import { PhaseFinaleDto } from '../dto/phase-finale.dto';
import { ObtenirPhaseFinaleUseCase } from './obtenir-phase-finale.use-case';

@Injectable()
export class EnregistrerScoreMatchFinaleUseCase {
  constructor(
    @Inject(MATCH_FINALE_REPOSITORY) private readonly matchFinaleRepository: MatchFinaleRepository,
    @Inject(PHASE_FINALE_REPOSITORY) private readonly phaseFinaleRepository: PhaseFinaleRepository,
    private readonly phaseFinaleService: PhaseFinaleService,
    private readonly obtenirPhaseFinaleUseCase: ObtenirPhaseFinaleUseCase,
  ) {}

  async execute(matchId: string, scoreA: number, scoreB: number): Promise<PhaseFinaleDto> {
    const match = await this.matchFinaleRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException(`Match de phase finale ${matchId} introuvable`);
    }
    if (scoreA === scoreB) {
      throw new BadRequestException(
        'Un match de phase finale ne peut pas se terminer sur un score nul',
      );
    }

    const matchMisAJour: MatchFinale = { ...match, scoreA, scoreB, statut: 'termine' };
    await this.matchFinaleRepository.save(matchMisAJour);

    const phaseFinale = await this.phaseFinaleRepository.obtenir();
    if (!phaseFinale) {
      return this.obtenirPhaseFinaleUseCase.execute();
    }

    let phaseFinaleMaJ = phaseFinale;

    if (matchMisAJour.type === 'demi_finale_a' || matchMisAJour.type === 'demi_finale_b') {
      if (phaseFinale.finaleCardebatId === null && phaseFinale.finaleLeGallId === null) {
        const [autreDemiFinaleA, autreDemiFinaleB] = await Promise.all([
          this.matchFinaleRepository.findById(phaseFinale.demiFinaleAId),
          this.matchFinaleRepository.findById(phaseFinale.demiFinaleBId),
        ]);
        const demiFinaleA = matchMisAJour.type === 'demi_finale_a' ? matchMisAJour : autreDemiFinaleA;
        const demiFinaleB = matchMisAJour.type === 'demi_finale_b' ? matchMisAJour : autreDemiFinaleB;

        if (demiFinaleA?.statut === 'termine' && demiFinaleB?.statut === 'termine') {
          const { finaleCardebat, finaleLeGall } = this.phaseFinaleService.creerFinales(
            demiFinaleA,
            demiFinaleB,
          );
          await this.matchFinaleRepository.save(finaleCardebat);
          await this.matchFinaleRepository.save(finaleLeGall);
          phaseFinaleMaJ = {
            ...phaseFinaleMaJ,
            finaleCardebatId: finaleCardebat.id,
            finaleLeGallId: finaleLeGall.id,
          };
        }
      }
    } else {
      const [autreFinaleCardebat, autreFinaleLeGall] = await Promise.all([
        phaseFinale.finaleCardebatId
          ? this.matchFinaleRepository.findById(phaseFinale.finaleCardebatId)
          : Promise.resolve(null),
        phaseFinale.finaleLeGallId
          ? this.matchFinaleRepository.findById(phaseFinale.finaleLeGallId)
          : Promise.resolve(null),
      ]);
      const finaleCardebat = matchMisAJour.type === 'finale_cardebat' ? matchMisAJour : autreFinaleCardebat;
      const finaleLeGall = matchMisAJour.type === 'finale_le_gall' ? matchMisAJour : autreFinaleLeGall;

      if (finaleCardebat?.statut === 'termine' && finaleLeGall?.statut === 'termine') {
        phaseFinaleMaJ = { ...phaseFinaleMaJ, statut: 'terminee' };
      }
    }

    if (phaseFinaleMaJ !== phaseFinale) {
      await this.phaseFinaleRepository.save(phaseFinaleMaJ);
    }

    return this.obtenirPhaseFinaleUseCase.execute();
  }
}
