import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { EnregistrerScoreMatchDto } from '../../../application/tour/dto/enregistrer-score-match.dto';
import {
  TerminerTourDto,
  TerminerTourResultDto,
} from '../../../application/tour/dto/terminer-tour.dto';
import { TourCourantDto } from '../../../application/tour/dto/tour-courant.dto';
import { EnregistrerScoreMatchUseCase } from '../../../application/tour/use-cases/enregistrer-score-match.use-case';
import { ObtenirTourCourantUseCase } from '../../../application/tour/use-cases/obtenir-tour-courant.use-case';
import { TerminerTourUseCase } from '../../../application/tour/use-cases/terminer-tour.use-case';
import { RequireAdmin } from '../shared/require-admin.decorator';

@Controller('tours')
export class TourController {
  constructor(
    private readonly obtenirTourCourantUseCase: ObtenirTourCourantUseCase,
    private readonly terminerTourUseCase: TerminerTourUseCase,
    private readonly enregistrerScoreMatchUseCase: EnregistrerScoreMatchUseCase,
  ) {}

  @Get('courant')
  async getCourant(): Promise<TourCourantDto> {
    return this.obtenirTourCourantUseCase.execute();
  }

  @Post('courant/terminer')
  @RequireAdmin()
  async terminer(@Body() dto: TerminerTourDto): Promise<TerminerTourResultDto> {
    return this.terminerTourUseCase.execute(dto.action, dto.parametres);
  }

  @Patch('matches/:id/score')
  @RequireAdmin()
  async enregistrerScore(
    @Param('id') id: string,
    @Body() dto: EnregistrerScoreMatchDto,
  ): Promise<TourCourantDto> {
    return this.enregistrerScoreMatchUseCase.execute(
      id,
      dto.scoreA,
      dto.scoreB,
    );
  }
}
