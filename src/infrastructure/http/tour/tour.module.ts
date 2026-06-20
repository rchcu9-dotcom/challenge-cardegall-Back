import { Module } from '@nestjs/common';
import { DemarrerPhaseFinaleUseCase } from '../../../application/finale/use-cases/demarrer-phase-finale.use-case';
import { EnregistrerScoreMatchUseCase } from '../../../application/tour/use-cases/enregistrer-score-match.use-case';
import { ObtenirTourCourantUseCase } from '../../../application/tour/use-cases/obtenir-tour-courant.use-case';
import { TerminerTourUseCase } from '../../../application/tour/use-cases/terminer-tour.use-case';
import { ClassementNaiveService } from '../../../domain/classement/services/classement-naive.service';
import { PhaseFinaleService } from '../../../domain/finale/services/phase-finale.service';
import { PlanningNaiveService } from '../../../domain/planning/services/planning-naive.service';
import {
  APPARIEMENT_SERVICE,
  CLASSEMENT_SERVICE,
  CLOCK,
  CYCLE_TOURNOI_REPOSITORY,
  MATCH_FINALE_REPOSITORY,
  MATCH_REPOSITORY,
  PHASE_FINALE_REPOSITORY,
  PLANNING_SERVICE,
  TOUR_REPOSITORY,
} from '../../../domain/shared/tokens';
import { AppariementSuisseService } from '../../../domain/tour/services/appariement-suisse.service';
// In-memory bindings conservés en commentaire pour faciliter un retour en arrière en dev/tests :
// import { CycleTournoiInMemoryRepository } from '../../persistence/in-memory/cycle-tournoi.in-memory.repository';
// import { MatchInMemoryRepository } from '../../persistence/in-memory/match.in-memory.repository';
// import { TourInMemoryRepository } from '../../persistence/in-memory/tour.in-memory.repository';
import { CycleTournoiPrismaRepository } from '../../persistence/prisma/cycle-tournoi.prisma.repository';
import { MatchFinalePrismaRepository } from '../../persistence/prisma/match-finale.prisma.repository';
import { MatchPrismaRepository } from '../../persistence/prisma/match.prisma.repository';
import { PhaseFinalePrismaRepository } from '../../persistence/prisma/phase-finale.prisma.repository';
import { TourPrismaRepository } from '../../persistence/prisma/tour.prisma.repository';
import { SystemClock } from '../../shared/system-clock.adapter';
import { EquipeModule } from '../equipe/equipe.module';
import { TourController } from './tour.controller';

@Module({
  imports: [EquipeModule],
  controllers: [TourController],
  providers: [
    ObtenirTourCourantUseCase,
    TerminerTourUseCase,
    EnregistrerScoreMatchUseCase,
    // DemarrerPhaseFinaleUseCase et ses dépendances finale/* sont dupliquées ici (cf. FinaleModule) :
    // TourModule ne peut pas importer FinaleModule, qui importe déjà TourModule (CYCLE_TOURNOI_REPOSITORY).
    DemarrerPhaseFinaleUseCase,
    PhaseFinaleService,
    { provide: PHASE_FINALE_REPOSITORY, useClass: PhaseFinalePrismaRepository },
    { provide: MATCH_FINALE_REPOSITORY, useClass: MatchFinalePrismaRepository },
    { provide: TOUR_REPOSITORY, useClass: TourPrismaRepository },
    { provide: MATCH_REPOSITORY, useClass: MatchPrismaRepository },
    { provide: CYCLE_TOURNOI_REPOSITORY, useClass: CycleTournoiPrismaRepository },
    { provide: APPARIEMENT_SERVICE, useClass: AppariementSuisseService },
    { provide: CLASSEMENT_SERVICE, useClass: ClassementNaiveService },
    { provide: PLANNING_SERVICE, useClass: PlanningNaiveService },
    { provide: CLOCK, useClass: SystemClock },
  ],
  exports: [CYCLE_TOURNOI_REPOSITORY],
})
export class TourModule {}
