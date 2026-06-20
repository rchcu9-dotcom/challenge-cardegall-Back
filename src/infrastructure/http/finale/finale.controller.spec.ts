import { Test, TestingModule } from '@nestjs/testing';
import { FinaleController } from './finale.controller';
import { ObtenirPhaseFinaleUseCase } from '../../../application/finale/use-cases/obtenir-phase-finale.use-case';
import { DemarrerPhaseFinaleUseCase } from '../../../application/finale/use-cases/demarrer-phase-finale.use-case';
import { EnregistrerScoreMatchFinaleUseCase } from '../../../application/finale/use-cases/enregistrer-score-match-finale.use-case';
import { PhaseFinaleDto } from '../../../application/finale/dto/phase-finale.dto';

function buildPhaseFinaleDto(overrides: Partial<PhaseFinaleDto> = {}): PhaseFinaleDto {
  return {
    demarree: false,
    statut: null,
    demiFinaleA: null,
    demiFinaleB: null,
    finaleCardebat: null,
    finaleLeGall: null,
    ...overrides,
  };
}

describe('FinaleController', () => {
  let controller: FinaleController;
  let obtenirPhaseFinaleUseCase: jest.Mocked<ObtenirPhaseFinaleUseCase>;
  let demarrerPhaseFinaleUseCase: jest.Mocked<DemarrerPhaseFinaleUseCase>;
  let enregistrerScoreMatchFinaleUseCase: jest.Mocked<EnregistrerScoreMatchFinaleUseCase>;

  beforeEach(async () => {
    obtenirPhaseFinaleUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ObtenirPhaseFinaleUseCase>;
    demarrerPhaseFinaleUseCase = { execute: jest.fn() } as unknown as jest.Mocked<DemarrerPhaseFinaleUseCase>;
    enregistrerScoreMatchFinaleUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<EnregistrerScoreMatchFinaleUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinaleController],
      providers: [
        { provide: ObtenirPhaseFinaleUseCase, useValue: obtenirPhaseFinaleUseCase },
        { provide: DemarrerPhaseFinaleUseCase, useValue: demarrerPhaseFinaleUseCase },
        { provide: EnregistrerScoreMatchFinaleUseCase, useValue: enregistrerScoreMatchFinaleUseCase },
      ],
    }).compile();

    controller = module.get(FinaleController);
  });

  it('GET /finale/courante délègue à ObtenirPhaseFinaleUseCase', async () => {
    const dto = buildPhaseFinaleDto();
    obtenirPhaseFinaleUseCase.execute.mockResolvedValue(dto);

    const result = await controller.getCourante();

    expect(obtenirPhaseFinaleUseCase.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual(dto);
  });

  it('POST /finale/demarrer délègue à DemarrerPhaseFinaleUseCase', async () => {
    const dto = buildPhaseFinaleDto({ demarree: true, statut: 'en_cours' });
    demarrerPhaseFinaleUseCase.execute.mockResolvedValue(dto);

    const result = await controller.demarrer();

    expect(demarrerPhaseFinaleUseCase.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual(dto);
  });

  it('PATCH /finale/matches/:id/score délègue à EnregistrerScoreMatchFinaleUseCase avec id, scoreA, scoreB', async () => {
    const dto = buildPhaseFinaleDto({ demarree: true, statut: 'en_cours' });
    enregistrerScoreMatchFinaleUseCase.execute.mockResolvedValue(dto);

    const result = await controller.enregistrerScore('match-1', { scoreA: 3, scoreB: 1 });

    expect(enregistrerScoreMatchFinaleUseCase.execute).toHaveBeenCalledWith('match-1', 3, 1);
    expect(result).toEqual(dto);
  });
});
