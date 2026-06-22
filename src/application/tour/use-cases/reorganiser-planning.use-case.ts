import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Match } from '../../../domain/match/entities/match.entity';
import type { MatchRepository } from '../../../domain/match/repositories/match.repository.interface';
import type { PlanningService } from '../../../domain/planning/services/planning.service';
import type { ClockPort } from '../../../domain/shared/ports/clock.port';
import {
  CLOCK,
  MATCH_REPOSITORY,
  PLANNING_SERVICE,
  TOUR_REPOSITORY,
} from '../../../domain/shared/tokens';
import type { TourRepository } from '../../../domain/tour/repositories/tour.repository.interface';
import { TerrainPlanningDto } from '../dto/reorganiser-planning.dto';
import { TourCourantDto } from '../dto/tour-courant.dto';
import { ObtenirTourCourantUseCase } from './obtenir-tour-courant.use-case';

@Injectable()
export class ReorganiserPlanningUseCase {
  constructor(
    @Inject(TOUR_REPOSITORY) private readonly tourRepository: TourRepository,
    @Inject(MATCH_REPOSITORY) private readonly matchRepository: MatchRepository,
    @Inject(PLANNING_SERVICE) private readonly planningService: PlanningService,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly obtenirTourCourantUseCase: ObtenirTourCourantUseCase,
  ) {}

  async execute(parTerrain: TerrainPlanningDto[]): Promise<TourCourantDto> {
    const tour = await this.tourRepository.findCurrent();
    if (!tour) {
      throw new NotFoundException('Aucun tour en cours');
    }
    if (tour.statut !== 'en_cours') {
      throw new ConflictException("Le tour courant n'est pas en cours");
    }

    const matches = await this.matchRepository.findByTour(tour.id);
    const editables = matches.filter(
      (match) => !match.estBye && match.statut === 'a_jouer',
    );
    const figes = matches.filter(
      (match) => !match.estBye && match.statut !== 'a_jouer',
    );

    this.validerTerrains(parTerrain, tour.parametres.nomsTerrains);
    const editablesParId = this.validerMatchIds(parTerrain, editables);

    const matchesParTerrain: Record<string, Match[]> = {};
    for (const { terrain, matchIds } of parTerrain) {
      matchesParTerrain[terrain] = matchIds.map(
        (id) => editablesParId.get(id) as Match,
      );
    }

    const ancrePartTerrain: Record<string, Date | null> = {};
    for (const { terrain } of parTerrain) {
      const finsFigees = figes
        .filter((match) => match.terrain === terrain && match.heureFinPrevue)
        .map((match) => new Date(match.heureFinPrevue as string).getTime());
      ancrePartTerrain[terrain] =
        finsFigees.length > 0 ? new Date(Math.max(...finsFigees)) : null;
    }

    const matchesRecalcules = this.planningService.recalculerHorairesManuel(
      matchesParTerrain,
      ancrePartTerrain,
      tour.parametres,
      this.clock.now(),
    );

    await this.matchRepository.saveMany(matchesRecalcules);

    return this.obtenirTourCourantUseCase.execute();
  }

  private validerTerrains(
    parTerrain: TerrainPlanningDto[],
    nomsTerrains: string[],
  ): void {
    const recus = parTerrain.map((t) => t.terrain);
    const attendus = new Set(nomsTerrains);
    const recusSet = new Set(recus);

    const memesElements =
      recus.length === recusSet.size &&
      recusSet.size === attendus.size &&
      [...attendus].every((terrain) => recusSet.has(terrain));

    if (!memesElements) {
      throw new BadRequestException(
        'La disposition envoyée ne correspond pas aux terrains du tour courant',
      );
    }
  }

  private validerMatchIds(
    parTerrain: TerrainPlanningDto[],
    editables: Match[],
  ): Map<string, Match> {
    const idsRecus = parTerrain.flatMap((t) => t.matchIds);
    const idsRecusSet = new Set(idsRecus);
    const editablesParId = new Map(editables.map((match) => [match.id, match]));
    const idsAttendusSet = new Set(editablesParId.keys());

    const memesElements =
      idsRecus.length === idsRecusSet.size &&
      idsRecusSet.size === idsAttendusSet.size &&
      [...idsAttendusSet].every((id) => idsRecusSet.has(id));

    if (!memesElements) {
      throw new BadRequestException(
        'La disposition envoyée ne correspond pas aux matchs à jouer du tour courant',
      );
    }

    return editablesParId;
  }
}
