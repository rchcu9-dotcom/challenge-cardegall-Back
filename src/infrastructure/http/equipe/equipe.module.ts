import { Module } from '@nestjs/common';
import { CloturerEnrolementsUseCase } from '../../../application/equipe/use-cases/cloturer-enrolements.use-case';
import { EnrolerEquipeUseCase } from '../../../application/equipe/use-cases/enroler-equipe.use-case';
import { InscrireEquipeUseCase } from '../../../application/equipe/use-cases/inscrire-equipe.use-case';
import { ListerEquipesUseCase } from '../../../application/equipe/use-cases/lister-equipes.use-case';
import { ReordonnerEquipesUseCase } from '../../../application/equipe/use-cases/reordonner-equipes.use-case';
import { PlanningNaiveService } from '../../../domain/planning/services/planning-naive.service';
import {
  APPARIEMENT_SERVICE,
  CLOCK,
  ENROLEMENT_STATE_REPOSITORY,
  EQUIPE_REPOSITORY,
  MATCH_REPOSITORY,
  PLANNING_SERVICE,
  TOUR_REPOSITORY,
} from '../../../domain/shared/tokens';
import { AppariementSuisseService } from '../../../domain/tour/services/appariement-suisse.service';
// In-memory bindings conservés en commentaire pour faciliter un retour en arrière en dev/tests :
// import { EnrolementStateInMemoryRepository } from '../../persistence/in-memory/enrolement-state.in-memory.repository';
// import { EquipeInMemoryRepository } from '../../persistence/in-memory/equipe.in-memory.repository';
import { EnrolementStatePrismaRepository } from '../../persistence/prisma/enrolement-state.prisma.repository';
import { EquipePrismaRepository } from '../../persistence/prisma/equipe.prisma.repository';
import { MatchPrismaRepository } from '../../persistence/prisma/match.prisma.repository';
import { TourPrismaRepository } from '../../persistence/prisma/tour.prisma.repository';
import { SystemClock } from '../../shared/system-clock.adapter';
import { EquipeController } from './equipe.controller';

@Module({
  controllers: [EquipeController],
  providers: [
    InscrireEquipeUseCase,
    ListerEquipesUseCase,
    EnrolerEquipeUseCase,
    ReordonnerEquipesUseCase,
    CloturerEnrolementsUseCase,
    { provide: EQUIPE_REPOSITORY, useClass: EquipePrismaRepository },
    { provide: ENROLEMENT_STATE_REPOSITORY, useClass: EnrolementStatePrismaRepository },
    { provide: TOUR_REPOSITORY, useClass: TourPrismaRepository },
    { provide: MATCH_REPOSITORY, useClass: MatchPrismaRepository },
    { provide: APPARIEMENT_SERVICE, useClass: AppariementSuisseService },
    { provide: PLANNING_SERVICE, useClass: PlanningNaiveService },
    { provide: CLOCK, useClass: SystemClock },
  ],
  exports: [EQUIPE_REPOSITORY],
})
export class EquipeModule {}
