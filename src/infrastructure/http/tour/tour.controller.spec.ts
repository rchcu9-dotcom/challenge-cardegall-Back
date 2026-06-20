import { Test, TestingModule } from '@nestjs/testing';
import { TourController } from './tour.controller';
import { EnregistrerScoreMatchUseCase } from '../../../application/tour/use-cases/enregistrer-score-match.use-case';
import { ObtenirTourCourantUseCase } from '../../../application/tour/use-cases/obtenir-tour-courant.use-case';
import { TerminerTourUseCase } from '../../../application/tour/use-cases/terminer-tour.use-case';
import { TourCourantDto } from '../../../application/tour/dto/tour-courant.dto';
import { TerminerTourResultDto } from '../../../application/tour/dto/terminer-tour.dto';

function buildTourCourantDto(): TourCourantDto {
  return {
    tour: {
      id: 'tour-1',
      numero: 1,
      statut: 'en_cours',
      parametres: {
        nomsTerrains: ['A', 'B'],
        dureeMatchMinutes: 15,
        latenceMinutes: 5,
        delaiDemarrageMinutes: 3,
      },
      equipesBecot: [],
    },
    matches: [],
    classement: [],
    resultatsComplets: false,
  };
}

describe('TourController', () => {
  let controller: TourController;
  let obtenirTourCourantUseCase: jest.Mocked<ObtenirTourCourantUseCase>;
  let terminerTourUseCase: jest.Mocked<TerminerTourUseCase>;
  let enregistrerScoreMatchUseCase: jest.Mocked<EnregistrerScoreMatchUseCase>;

  beforeEach(async () => {
    obtenirTourCourantUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ObtenirTourCourantUseCase>;
    terminerTourUseCase = { execute: jest.fn() } as unknown as jest.Mocked<TerminerTourUseCase>;
    enregistrerScoreMatchUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<EnregistrerScoreMatchUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TourController],
      providers: [
        { provide: ObtenirTourCourantUseCase, useValue: obtenirTourCourantUseCase },
        { provide: TerminerTourUseCase, useValue: terminerTourUseCase },
        { provide: EnregistrerScoreMatchUseCase, useValue: enregistrerScoreMatchUseCase },
      ],
    }).compile();

    controller = module.get(TourController);
  });

  it('GET /tours/courant délègue à ObtenirTourCourantUseCase et retourne le TourCourantDto', async () => {
    const dto = buildTourCourantDto();
    obtenirTourCourantUseCase.execute.mockResolvedValue(dto);

    const result = await controller.getCourant();

    expect(obtenirTourCourantUseCase.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual(dto);
  });

  it('POST /tours/courant/terminer délègue à TerminerTourUseCase avec l\'action reçue (nouveau_tour)', async () => {
    const resultDto: TerminerTourResultDto = {
      action: 'nouveau_tour',
      tour: {
        id: 'tour-2',
        numero: 2,
        statut: 'en_cours',
        parametres: {
          nomsTerrains: ['A', 'B'],
          dureeMatchMinutes: 15,
          latenceMinutes: 5,
          delaiDemarrageMinutes: 3,
        },
        equipesBecot: [],
      },
      matches: [],
    };
    terminerTourUseCase.execute.mockResolvedValue(resultDto);

    const result = await controller.terminer({ action: 'nouveau_tour' });

    expect(terminerTourUseCase.execute).toHaveBeenCalledWith('nouveau_tour', undefined);
    expect(result).toEqual(resultDto);
  });

  it('POST /tours/courant/terminer délègue à TerminerTourUseCase avec l\'action reçue (phase_finale)', async () => {
    const resultDto: TerminerTourResultDto = {
      action: 'phase_finale',
      classementFinal: [],
    };
    terminerTourUseCase.execute.mockResolvedValue(resultDto);

    const result = await controller.terminer({ action: 'phase_finale' });

    expect(terminerTourUseCase.execute).toHaveBeenCalledWith('phase_finale', undefined);
    expect(result).toEqual(resultDto);
  });

  it('PATCH /tours/matches/:id/score délègue à EnregistrerScoreMatchUseCase avec id, scoreA et scoreB', async () => {
    const dto = buildTourCourantDto();
    enregistrerScoreMatchUseCase.execute.mockResolvedValue(dto);

    const result = await controller.enregistrerScore('match-1', { scoreA: 3, scoreB: 1 });

    expect(enregistrerScoreMatchUseCase.execute).toHaveBeenCalledWith('match-1', 3, 1);
    expect(result).toEqual(dto);
  });
});
