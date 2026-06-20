import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { EnregistrerScoreMatchFinaleDto } from '../../../application/finale/dto/enregistrer-score-match-finale.dto';
import { PhaseFinaleDto } from '../../../application/finale/dto/phase-finale.dto';
import { DemarrerPhaseFinaleUseCase } from '../../../application/finale/use-cases/demarrer-phase-finale.use-case';
import { EnregistrerScoreMatchFinaleUseCase } from '../../../application/finale/use-cases/enregistrer-score-match-finale.use-case';
import { ObtenirPhaseFinaleUseCase } from '../../../application/finale/use-cases/obtenir-phase-finale.use-case';
import { RequireAdmin } from '../shared/require-admin.decorator';

@Controller('finale')
export class FinaleController {
  constructor(
    private readonly obtenirPhaseFinaleUseCase: ObtenirPhaseFinaleUseCase,
    private readonly demarrerPhaseFinaleUseCase: DemarrerPhaseFinaleUseCase,
    private readonly enregistrerScoreMatchFinaleUseCase: EnregistrerScoreMatchFinaleUseCase,
  ) {}

  @Get('courante')
  async getCourante(): Promise<PhaseFinaleDto> {
    return this.obtenirPhaseFinaleUseCase.execute();
  }

  @Post('demarrer')
  @RequireAdmin()
  async demarrer(): Promise<PhaseFinaleDto> {
    return this.demarrerPhaseFinaleUseCase.execute();
  }

  @Patch('matches/:id/score')
  @RequireAdmin()
  async enregistrerScore(
    @Param('id') id: string,
    @Body() dto: EnregistrerScoreMatchFinaleDto,
  ): Promise<PhaseFinaleDto> {
    return this.enregistrerScoreMatchFinaleUseCase.execute(id, dto.scoreA, dto.scoreB);
  }
}
