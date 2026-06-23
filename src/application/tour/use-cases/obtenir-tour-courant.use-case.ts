import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import type { MatchRepository } from '../../../domain/match/repositories/match.repository.interface';
import {
  CLASSEMENT_SERVICE,
  EQUIPE_REPOSITORY,
  MATCH_REPOSITORY,
  TOUR_REPOSITORY,
} from '../../../domain/shared/tokens';
import type { ClassementService } from '../../../domain/classement/services/classement.service';
import type { TourRepository } from '../../../domain/tour/repositories/tour.repository.interface';
import { toClassementEntryDto } from '../dto/classement-entry.dto';
import { toMatchDto } from '../dto/match.dto';
import { toTourDto } from '../dto/tour.dto';
import { TourCourantDto } from '../dto/tour-courant.dto';

@Injectable()
export class ObtenirTourCourantUseCase {
  constructor(
    @Inject(TOUR_REPOSITORY) private readonly tourRepository: TourRepository,
    @Inject(MATCH_REPOSITORY) private readonly matchRepository: MatchRepository,
    @Inject(EQUIPE_REPOSITORY)
    private readonly equipeRepository: EquipeRepository,
    @Inject(CLASSEMENT_SERVICE)
    private readonly classementService: ClassementService,
  ) {}

  async execute(): Promise<TourCourantDto> {
    const tour = await this.tourRepository.findCurrent();
    if (!tour) {
      throw new NotFoundException('Aucun tour en cours');
    }

    const matches = await this.matchRepository.findByTour(tour.id);
    const toutesEquipes = await this.equipeRepository.findAll();
    const equipes = toutesEquipes.filter(
      (equipe) => equipe.statut !== 'retiree',
    );
    const tousLesMatchs = await this.matchRepository.findAll();

    const classement = this.classementService.calculer(equipes, tousLesMatchs);

    const resultatsComplets =
      matches.length > 0 &&
      matches.every((match) => match.statut === 'termine' || match.estBye);

    return {
      tour: toTourDto(tour),
      matches: matches.map(toMatchDto),
      tousLesMatchs: tousLesMatchs.map(toMatchDto),
      classement: classement.map(toClassementEntryDto),
      resultatsComplets,
    };
  }
}
