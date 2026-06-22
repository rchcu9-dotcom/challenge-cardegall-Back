import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import type { MatchRepository } from '../../../domain/match/repositories/match.repository.interface';
import type { ClockPort } from '../../../domain/shared/ports/clock.port';
import {
  CLOCK,
  EQUIPE_REPOSITORY,
  MATCH_REPOSITORY,
  TOUR_REPOSITORY,
} from '../../../domain/shared/tokens';
import { Tour } from '../../../domain/tour/entities/tour.entity';
import type { TourRepository } from '../../../domain/tour/repositories/tour.repository.interface';
import {
  PARAMETRES_PREMIER_TOUR,
  PremierTourService,
} from '../../../domain/tour/services/premier-tour.service';

const MIN_EQUIPES_PLANNING_PROVISOIRE = 2;

@Injectable()
export class CalculerPlanningProvisoireUseCase {
  constructor(
    @Inject(EQUIPE_REPOSITORY) private readonly equipes: EquipeRepository,
    @Inject(TOUR_REPOSITORY) private readonly tourRepository: TourRepository,
    @Inject(MATCH_REPOSITORY) private readonly matchRepository: MatchRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly premierTourService: PremierTourService,
  ) {}

  async execute(): Promise<Tour> {
    const tourExistant = await this.tourRepository.findLast();
    if (tourExistant) {
      throw new ConflictException(
        'Un planning a déjà été calculé pour le Tour n°1',
      );
    }

    const enrolees = await this.equipes.findEnroleesOrdered();
    if (enrolees.length < MIN_EQUIPES_PLANNING_PROVISOIRE) {
      throw new BadRequestException(
        `Au moins ${MIN_EQUIPES_PLANNING_PROVISOIRE} équipes enrôlées sont requises pour calculer un planning provisoire`,
      );
    }

    const { tour, matches } = this.premierTourService.construire({
      equipesEngagees: enrolees,
      parametres: PARAMETRES_PREMIER_TOUR,
      maintenant: this.clock.now(),
    });

    await this.tourRepository.save(tour);
    await this.matchRepository.saveMany(matches);

    return tour;
  }
}
