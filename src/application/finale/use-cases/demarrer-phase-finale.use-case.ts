import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PhaseFinaleService } from '../../../domain/finale/services/phase-finale.service';
import type { MatchFinaleRepository } from '../../../domain/finale/repositories/match-finale.repository.interface';
import type { PhaseFinaleRepository } from '../../../domain/finale/repositories/phase-finale.repository.interface';
import type { CycleTournoiRepository } from '../../../domain/tour/repositories/cycle-tournoi.repository.interface';
import {
  CYCLE_TOURNOI_REPOSITORY,
  MATCH_FINALE_REPOSITORY,
  PHASE_FINALE_REPOSITORY,
} from '../../../domain/shared/tokens';
import { toMatchFinaleDto } from '../dto/match-finale.dto';
import { PhaseFinaleDto } from '../dto/phase-finale.dto';

@Injectable()
export class DemarrerPhaseFinaleUseCase {
  constructor(
    @Inject(CYCLE_TOURNOI_REPOSITORY)
    private readonly cycleTournoiRepository: CycleTournoiRepository,
    @Inject(PHASE_FINALE_REPOSITORY)
    private readonly phaseFinaleRepository: PhaseFinaleRepository,
    @Inject(MATCH_FINALE_REPOSITORY)
    private readonly matchFinaleRepository: MatchFinaleRepository,
    private readonly phaseFinaleService: PhaseFinaleService,
  ) {}

  async execute(): Promise<PhaseFinaleDto> {
    const phaseFinaleDeclenchee =
      await this.cycleTournoiRepository.estPhaseFinaleDeclenchee();
    if (!phaseFinaleDeclenchee) {
      throw new BadRequestException("La phase de poules n'est pas terminée");
    }

    const phaseFinaleExistante = await this.phaseFinaleRepository.obtenir();
    if (phaseFinaleExistante) {
      throw new ConflictException('La phase finale a déjà été démarrée');
    }

    const classementFinal =
      await this.cycleTournoiRepository.obtenirClassementFinalPoules();
    if (!classementFinal || classementFinal.length < 4) {
      throw new BadRequestException(
        'Classement final insuffisant pour démarrer la phase finale',
      );
    }

    const { demiFinaleA, demiFinaleB } =
      this.phaseFinaleService.creerDemiFinales(classementFinal);
    await this.matchFinaleRepository.save(demiFinaleA);
    await this.matchFinaleRepository.save(demiFinaleB);

    const phaseFinale = await this.phaseFinaleRepository.save({
      id: randomUUID(),
      demiFinaleAId: demiFinaleA.id,
      demiFinaleBId: demiFinaleB.id,
      finaleCardebatId: null,
      finaleLeGallId: null,
      statut: 'en_cours',
    });

    return {
      demarree: true,
      statut: phaseFinale.statut,
      demiFinaleA: toMatchFinaleDto(demiFinaleA),
      demiFinaleB: toMatchFinaleDto(demiFinaleB),
      finaleCardebat: null,
      finaleLeGall: null,
    };
  }
}
