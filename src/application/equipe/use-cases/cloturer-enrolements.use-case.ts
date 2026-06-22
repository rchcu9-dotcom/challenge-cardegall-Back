import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Equipe } from '../../../domain/equipe/entities/equipe.entity';
import type { EnrolementStateRepository } from '../../../domain/equipe/repositories/enrolement-state.repository.interface';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import type { MatchRepository } from '../../../domain/match/repositories/match.repository.interface';
import type { ClockPort } from '../../../domain/shared/ports/clock.port';
import {
  CLOCK,
  ENROLEMENT_STATE_REPOSITORY,
  EQUIPE_REPOSITORY,
  MATCH_REPOSITORY,
  TOUR_REPOSITORY,
} from '../../../domain/shared/tokens';
import type { TourRepository } from '../../../domain/tour/repositories/tour.repository.interface';
import {
  PARAMETRES_PREMIER_TOUR,
  PremierTourService,
} from '../../../domain/tour/services/premier-tour.service';

const MIN_EQUIPES_ENGAGEES = 2;

export interface ClotureResult {
  equipes: Equipe[];
  cloture: true;
}

@Injectable()
export class CloturerEnrolementsUseCase {
  constructor(
    @Inject(EQUIPE_REPOSITORY) private readonly equipes: EquipeRepository,
    @Inject(ENROLEMENT_STATE_REPOSITORY)
    private readonly enrolementState: EnrolementStateRepository,
    @Inject(TOUR_REPOSITORY) private readonly tourRepository: TourRepository,
    @Inject(MATCH_REPOSITORY) private readonly matchRepository: MatchRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly premierTourService: PremierTourService,
  ) {}

  async execute(): Promise<ClotureResult> {
    if (await this.enrolementState.isCloture()) {
      throw new ConflictException('Les enrôlements sont déjà clôturés');
    }

    const tourExistant = await this.tourRepository.findLast();

    const enrolees = await this.equipes.findEnroleesOrdered();
    if (enrolees.length < MIN_EQUIPES_ENGAGEES) {
      throw new BadRequestException(
        `Au moins ${MIN_EQUIPES_ENGAGEES} équipes enrôlées sont requises pour clôturer les enrôlements`,
      );
    }

    const engagees: Equipe[] = [];
    for (const equipe of enrolees) {
      engagees.push(await this.equipes.save({ ...equipe, statut: 'engagee' }));
    }

    await this.enrolementState.cloturer();

    if (!tourExistant) {
      const { tour, matches } = this.premierTourService.construire({
        equipesEngagees: engagees,
        parametres: PARAMETRES_PREMIER_TOUR,
        maintenant: this.clock.now(),
      });

      await this.tourRepository.save(tour);
      await this.matchRepository.saveMany(matches);
    }

    return { equipes: engagees, cloture: true };
  }
}
