import { Module } from '@nestjs/common';
import { DemarrerPhaseFinaleUseCase } from '../../../application/finale/use-cases/demarrer-phase-finale.use-case';
import { EnregistrerScoreMatchFinaleUseCase } from '../../../application/finale/use-cases/enregistrer-score-match-finale.use-case';
import { ObtenirPhaseFinaleUseCase } from '../../../application/finale/use-cases/obtenir-phase-finale.use-case';
import { PhaseFinaleService } from '../../../domain/finale/services/phase-finale.service';
import {
  MATCH_FINALE_REPOSITORY,
  PHASE_FINALE_REPOSITORY,
} from '../../../domain/shared/tokens';
// In-memory bindings conservés en commentaire pour faciliter un retour en arrière en dev/tests :
// import { MatchFinaleInMemoryRepository } from '../../persistence/in-memory/match-finale.in-memory.repository';
// import { PhaseFinaleInMemoryRepository } from '../../persistence/in-memory/phase-finale.in-memory.repository';
import { MatchFinalePrismaRepository } from '../../persistence/prisma/match-finale.prisma.repository';
import { PhaseFinalePrismaRepository } from '../../persistence/prisma/phase-finale.prisma.repository';
import { TourModule } from '../tour/tour.module';
import { FinaleController } from './finale.controller';

@Module({
  imports: [TourModule],
  controllers: [FinaleController],
  providers: [
    ObtenirPhaseFinaleUseCase,
    DemarrerPhaseFinaleUseCase,
    EnregistrerScoreMatchFinaleUseCase,
    PhaseFinaleService,
    { provide: PHASE_FINALE_REPOSITORY, useClass: PhaseFinalePrismaRepository },
    { provide: MATCH_FINALE_REPOSITORY, useClass: MatchFinalePrismaRepository },
  ],
})
export class FinaleModule {}
