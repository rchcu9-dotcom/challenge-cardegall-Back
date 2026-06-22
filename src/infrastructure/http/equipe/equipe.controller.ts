import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { EnrolerEquipeDto } from '../../../application/equipe/dto/enroler-equipe.dto';
import {
  EquipeDto,
  toEquipeDto,
} from '../../../application/equipe/dto/equipe.dto';
import { InscrireEquipeDto } from '../../../application/equipe/dto/inscrire-equipe.dto';
import { ReordonnerEquipesDto } from '../../../application/equipe/dto/reordonner-equipes.dto';
import { CalculerPlanningProvisoireUseCase } from '../../../application/equipe/use-cases/calculer-planning-provisoire.use-case';
import { CloturerEnrolementsUseCase } from '../../../application/equipe/use-cases/cloturer-enrolements.use-case';
import { DecloturerEnrolementsUseCase } from '../../../application/equipe/use-cases/decloturer-enrolements.use-case';
import { EnrolerEquipeUseCase } from '../../../application/equipe/use-cases/enroler-equipe.use-case';
import { InscrireEquipeUseCase } from '../../../application/equipe/use-cases/inscrire-equipe.use-case';
import { ListerEquipesUseCase } from '../../../application/equipe/use-cases/lister-equipes.use-case';
import { ReordonnerEquipesUseCase } from '../../../application/equipe/use-cases/reordonner-equipes.use-case';
import { TourDto, toTourDto } from '../../../application/tour/dto/tour.dto';
import type { EnrolementStateRepository } from '../../../domain/equipe/repositories/enrolement-state.repository.interface';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import {
  ENROLEMENT_STATE_REPOSITORY,
  EQUIPE_REPOSITORY,
} from '../../../domain/shared/tokens';
import { RequireAdmin } from '../shared/require-admin.decorator';

@Controller('equipes')
export class EquipeController {
  constructor(
    private readonly inscrireEquipeUseCase: InscrireEquipeUseCase,
    private readonly listerEquipesUseCase: ListerEquipesUseCase,
    private readonly enrolerEquipeUseCase: EnrolerEquipeUseCase,
    private readonly reordonnerEquipesUseCase: ReordonnerEquipesUseCase,
    private readonly cloturerEnrolementsUseCase: CloturerEnrolementsUseCase,
    private readonly decloturerEnrolementsUseCase: DecloturerEnrolementsUseCase,
    private readonly calculerPlanningProvisoireUseCase: CalculerPlanningProvisoireUseCase,
    @Inject(EQUIPE_REPOSITORY)
    private readonly equipeRepository: EquipeRepository,
    @Inject(ENROLEMENT_STATE_REPOSITORY)
    private readonly enrolementStateRepository: EnrolementStateRepository,
  ) {}

  @Get()
  async findAll(): Promise<EquipeDto[]> {
    const equipes = await this.listerEquipesUseCase.execute();
    return equipes.map(toEquipeDto);
  }

  @Post()
  async inscrire(@Body() dto: InscrireEquipeDto): Promise<EquipeDto> {
    const equipe = await this.inscrireEquipeUseCase.execute(dto);
    return toEquipeDto(equipe);
  }

  @Get('enrolees')
  async findEnrolees(): Promise<EquipeDto[]> {
    const equipes = await this.equipeRepository.findAll();
    return equipes
      .filter((equipe) => equipe.statut === 'enrolee' || equipe.statut === 'engagee')
      .sort((a, b) => (a.ordreArrivee ?? 0) - (b.ordreArrivee ?? 0))
      .map(toEquipeDto);
  }

  @Get('enrolement-etat')
  async getEnrolementEtat(): Promise<{ cloture: boolean }> {
    return { cloture: await this.enrolementStateRepository.isCloture() };
  }

  @Patch(':id/enroler')
  @RequireAdmin()
  async enroler(
    @Param('id') id: string,
    @Body() dto: EnrolerEquipeDto,
  ): Promise<EquipeDto> {
    const equipe = await this.enrolerEquipeUseCase.execute(id, dto);
    return toEquipeDto(equipe);
  }

  @Patch('reordonner')
  @RequireAdmin()
  async reordonner(@Body() dto: ReordonnerEquipesDto): Promise<EquipeDto[]> {
    const equipes = await this.reordonnerEquipesUseCase.execute(dto.orderedIds);
    return equipes.map(toEquipeDto);
  }

  @Post('cloturer-enrolements')
  @RequireAdmin()
  async cloturer(): Promise<{ equipes: EquipeDto[]; cloture: true }> {
    const result = await this.cloturerEnrolementsUseCase.execute();
    return {
      equipes: result.equipes.map(toEquipeDto),
      cloture: result.cloture,
    };
  }

  @Post('decloturer-enrolements')
  @RequireAdmin()
  async decloturer(): Promise<{ equipes: EquipeDto[]; cloture: false }> {
    const result = await this.decloturerEnrolementsUseCase.execute();
    return {
      equipes: result.equipes.map(toEquipeDto),
      cloture: result.cloture,
    };
  }

  @Post('calculer-planning-provisoire')
  @RequireAdmin()
  async calculerPlanningProvisoire(): Promise<TourDto> {
    const tour = await this.calculerPlanningProvisoireUseCase.execute();
    return toTourDto(tour);
  }
}
