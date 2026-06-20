import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ClassementEntry } from '../../../domain/classement/entities/classement-entry.entity';
import { Equipe } from '../../../domain/equipe/entities/equipe.entity';
import type { EnrolementStateRepository } from '../../../domain/equipe/repositories/enrolement-state.repository.interface';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import { Match } from '../../../domain/match/entities/match.entity';
import type { MatchRepository } from '../../../domain/match/repositories/match.repository.interface';
import type { PlanningService } from '../../../domain/planning/services/planning.service';
import type { ClockPort } from '../../../domain/shared/ports/clock.port';
import {
  APPARIEMENT_SERVICE,
  CLOCK,
  ENROLEMENT_STATE_REPOSITORY,
  EQUIPE_REPOSITORY,
  MATCH_REPOSITORY,
  PLANNING_SERVICE,
  TOUR_REPOSITORY,
} from '../../../domain/shared/tokens';
import type {
  ParametresTour,
  Tour,
} from '../../../domain/tour/entities/tour.entity';
import type { TourRepository } from '../../../domain/tour/repositories/tour.repository.interface';
import type { AppariementService } from '../../../domain/tour/services/appariement.service';

const MIN_EQUIPES_ENGAGEES = 2;

const PARAMETRES_PREMIER_TOUR: ParametresTour = {
  nomsTerrains: ['A', 'B'],
  dureeMatchMinutes: 10,
  latenceMinutes: 2,
  delaiDemarrageMinutes: 3,
};

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
    @Inject(APPARIEMENT_SERVICE)
    private readonly appariementService: AppariementService,
    @Inject(PLANNING_SERVICE) private readonly planningService: PlanningService,
    @Inject(TOUR_REPOSITORY) private readonly tourRepository: TourRepository,
    @Inject(MATCH_REPOSITORY) private readonly matchRepository: MatchRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(): Promise<ClotureResult> {
    if (await this.enrolementState.isCloture()) {
      throw new ConflictException('Les enrôlements sont déjà clôturés');
    }

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

    const classementInitial: ClassementEntry[] = engagees.map(
      (equipe, index) => ({
        equipeId: equipe.id,
        points: 0,
        victoires: 0,
        nuls: 0,
        defaites: 0,
        butsMarques: 0,
        butsConcedes: 0,
        diffGenerale: 0,
        diffParticuliere: 0,
        nbFeminines: equipe.nbFemininesReel ?? equipe.nbFemininesEnvisage,
        rang: index + 1,
      }),
    );

    const { paires, becotEquipeId } =
      this.appariementService.genererAppariements(classementInitial, [], []);

    const nouveauTourId = randomUUID();
    const nouveauTour: Tour = {
      id: nouveauTourId,
      numero: 1,
      statut: 'en_cours',
      parametres: PARAMETRES_PREMIER_TOUR,
      equipesBecot: becotEquipeId ? [becotEquipeId] : [],
    };

    const matchesAppairesSansHoraire: Match[] = paires.map(
      ([equipeAId, equipeBId]) => ({
        id: randomUUID(),
        tourId: nouveauTourId,
        equipeAId,
        equipeBId,
        estBye: false,
        terrain: null,
        heureDebutPrevue: null,
        heureFinPrevue: null,
        scoreA: null,
        scoreB: null,
        statut: 'a_jouer' as const,
      }),
    );

    const matchesPlanifies = this.planningService.calculerHoraires(
      matchesAppairesSansHoraire,
      PARAMETRES_PREMIER_TOUR,
      this.clock.now(),
    );

    const nouveauxMatches: Match[] = [...matchesPlanifies];

    if (becotEquipeId) {
      nouveauxMatches.push({
        id: randomUUID(),
        tourId: nouveauTourId,
        equipeAId: becotEquipeId,
        equipeBId: null,
        estBye: true,
        terrain: null,
        heureDebutPrevue: null,
        heureFinPrevue: null,
        scoreA: null,
        scoreB: null,
        statut: 'termine' as const,
      });
    }

    await this.tourRepository.save(nouveauTour);
    await this.matchRepository.saveMany(nouveauxMatches);

    return { equipes: engagees, cloture: true };
  }
}
