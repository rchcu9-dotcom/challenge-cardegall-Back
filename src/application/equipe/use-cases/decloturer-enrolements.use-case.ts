import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Equipe } from '../../../domain/equipe/entities/equipe.entity';
import type { EnrolementStateRepository } from '../../../domain/equipe/repositories/enrolement-state.repository.interface';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import type { MatchRepository } from '../../../domain/match/repositories/match.repository.interface';
import {
  ENROLEMENT_STATE_REPOSITORY,
  EQUIPE_REPOSITORY,
  MATCH_REPOSITORY,
  TOUR_REPOSITORY,
} from '../../../domain/shared/tokens';
import type { TourRepository } from '../../../domain/tour/repositories/tour.repository.interface';

export interface DecloturationResult {
  equipes: Equipe[];
  cloture: false;
}

@Injectable()
export class DecloturerEnrolementsUseCase {
  constructor(
    @Inject(EQUIPE_REPOSITORY) private readonly equipes: EquipeRepository,
    @Inject(ENROLEMENT_STATE_REPOSITORY)
    private readonly enrolementState: EnrolementStateRepository,
    @Inject(TOUR_REPOSITORY) private readonly tourRepository: TourRepository,
    @Inject(MATCH_REPOSITORY) private readonly matchRepository: MatchRepository,
  ) {}

  async execute(): Promise<DecloturationResult> {
    if (!(await this.enrolementState.isCloture())) {
      throw new ConflictException('Les enrôlements ne sont pas clôturés');
    }

    const tour = await this.tourRepository.findLast();
    if (!tour || tour.numero !== 1 || tour.statut !== 'en_cours') {
      throw new ConflictException(
        'Impossible de décloturer : le tournoi a déjà progressé au-delà du Tour 1',
      );
    }

    const matches = await this.matchRepository.findByTour(tour.id);
    const resultatDejaSaisi = matches.some(
      (match) =>
        !match.estBye && (match.scoreA !== null || match.scoreB !== null),
    );
    if (resultatDejaSaisi) {
      throw new ConflictException(
        'Impossible de décloturer : des résultats ont déjà été saisis',
      );
    }

    const toutesEquipes = await this.equipes.findAll();
    const equipesEngagees = toutesEquipes.filter(
      (equipe) => equipe.statut === 'engagee',
    );

    const enrolees: Equipe[] = [];
    for (const equipe of equipesEngagees) {
      enrolees.push(await this.equipes.save({ ...equipe, statut: 'enrolee' }));
    }

    await this.matchRepository.deleteByTour(tour.id);
    await this.tourRepository.deleteById(tour.id);

    await this.enrolementState.decloturer();

    return { equipes: enrolees, cloture: false };
  }
}
