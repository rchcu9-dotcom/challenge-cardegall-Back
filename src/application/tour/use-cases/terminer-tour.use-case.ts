import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DemarrerPhaseFinaleUseCase } from '../../finale/use-cases/demarrer-phase-finale.use-case';
import type { ClassementService } from '../../../domain/classement/services/classement.service';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import { Match } from '../../../domain/match/entities/match.entity';
import type { MatchRepository } from '../../../domain/match/repositories/match.repository.interface';
import type { PlanningService } from '../../../domain/planning/services/planning.service';
import {
  APPARIEMENT_SERVICE,
  CLASSEMENT_SERVICE,
  CLOCK,
  CYCLE_TOURNOI_REPOSITORY,
  EQUIPE_REPOSITORY,
  MATCH_REPOSITORY,
  PLANNING_SERVICE,
  TOUR_REPOSITORY,
} from '../../../domain/shared/tokens';
import type { ClockPort } from '../../../domain/shared/ports/clock.port';
import type { AppariementService } from '../../../domain/tour/services/appariement.service';
import type { CycleTournoiRepository } from '../../../domain/tour/repositories/cycle-tournoi.repository.interface';
import type { ParametresTour } from '../../../domain/tour/entities/tour.entity';
import type { TourRepository } from '../../../domain/tour/repositories/tour.repository.interface';
import { toClassementEntryDto } from '../dto/classement-entry.dto';
import { toMatchDto } from '../dto/match.dto';
import { toTourDto } from '../dto/tour.dto';
import { ActionFinTour, TerminerTourResultDto } from '../dto/terminer-tour.dto';

@Injectable()
export class TerminerTourUseCase {
  constructor(
    @Inject(TOUR_REPOSITORY) private readonly tourRepository: TourRepository,
    @Inject(MATCH_REPOSITORY) private readonly matchRepository: MatchRepository,
    @Inject(EQUIPE_REPOSITORY)
    private readonly equipeRepository: EquipeRepository,
    @Inject(CLASSEMENT_SERVICE)
    private readonly classementService: ClassementService,
    @Inject(APPARIEMENT_SERVICE)
    private readonly appariementService: AppariementService,
    @Inject(CYCLE_TOURNOI_REPOSITORY)
    private readonly cycleTournoiRepository: CycleTournoiRepository,
    @Inject(PLANNING_SERVICE) private readonly planningService: PlanningService,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly demarrerPhaseFinaleUseCase: DemarrerPhaseFinaleUseCase,
  ) {}

  async execute(
    action: ActionFinTour,
    parametres?: ParametresTour,
  ): Promise<TerminerTourResultDto> {
    const tourCourant = await this.tourRepository.findCurrent();
    if (!tourCourant) {
      throw new NotFoundException('Aucun tour en cours');
    }
    if (tourCourant.statut !== 'en_cours') {
      throw new ConflictException('Le tour courant est déjà terminé');
    }

    const matchesTour = await this.matchRepository.findByTour(tourCourant.id);
    const resultatsComplets =
      matchesTour.length > 0 &&
      matchesTour.every((match) => match.statut === 'termine' || match.estBye);
    if (!resultatsComplets) {
      throw new BadRequestException(
        'Les résultats du tour en cours ne sont pas tous saisis',
      );
    }

    await this.tourRepository.save({ ...tourCourant, statut: 'termine' });

    const toutesEquipes = await this.equipeRepository.findAll();
    const equipes = toutesEquipes.filter(
      (equipe) => equipe.statut !== 'retiree',
    );
    const tousLesMatchs = await this.matchRepository.findAll();
    const classementFinal = this.classementService.calculer(
      equipes,
      tousLesMatchs,
    );

    if (action === 'phase_finale') {
      await this.cycleTournoiRepository.declencherPhaseFinale(classementFinal);

      let phaseFinaleDemarree = true;
      try {
        await this.demarrerPhaseFinaleUseCase.execute();
      } catch (error) {
        // Pas assez d'équipes au classement final, ou phase finale déjà démarrée :
        // le flag déclencherPhaseFinale reste posé, l'admin pourra démarrer manuellement
        // depuis /admin/finale dès que la condition sera remplie. Toute autre erreur remonte.
        if (
          error instanceof BadRequestException ||
          error instanceof ConflictException
        ) {
          phaseFinaleDemarree = false;
        } else {
          throw error;
        }
      }

      return {
        action: 'phase_finale',
        classementFinal: classementFinal.map(toClassementEntryDto),
        phaseFinaleDemarree,
      };
    }

    const { paires, becotEquipeId } =
      this.appariementService.genererAppariements(
        classementFinal,
        tourCourant.equipesBecot,
        tousLesMatchs,
      );

    const nouveauTourId = randomUUID();
    const parametresNouveauTour: ParametresTour = parametres ?? {
      ...tourCourant.parametres,
      nomsTerrains: [...tourCourant.parametres.nomsTerrains],
    };
    const nouveauTour = {
      id: nouveauTourId,
      numero: tourCourant.numero + 1,
      statut: 'en_cours' as const,
      parametres: parametresNouveauTour,
      equipesBecot: becotEquipeId
        ? [...tourCourant.equipesBecot, becotEquipeId]
        : [...tourCourant.equipesBecot],
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
      parametresNouveauTour,
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

    return {
      action: 'nouveau_tour',
      tour: toTourDto(nouveauTour),
      matches: nouveauxMatches.map(toMatchDto),
    };
  }
}
