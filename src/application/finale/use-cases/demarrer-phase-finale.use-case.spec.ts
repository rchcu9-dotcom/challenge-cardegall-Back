import { BadRequestException, ConflictException } from '@nestjs/common';
import { DemarrerPhaseFinaleUseCase } from './demarrer-phase-finale.use-case';
import type { MatchFinaleRepository } from '../../../domain/finale/repositories/match-finale.repository.interface';
import type { PhaseFinaleRepository } from '../../../domain/finale/repositories/phase-finale.repository.interface';
import type { CycleTournoiRepository } from '../../../domain/tour/repositories/cycle-tournoi.repository.interface';
import { PhaseFinaleService } from '../../../domain/finale/services/phase-finale.service';
import { ClassementEntry } from '../../../domain/classement/entities/classement-entry.entity';
import { MatchFinale } from '../../../domain/finale/entities/match-finale.entity';
import { PhaseFinale } from '../../../domain/finale/entities/phase-finale.entity';

function buildClassementEntry(overrides: Partial<ClassementEntry> = {}): ClassementEntry {
  return {
    equipeId: 'equipe-1',
    points: 0,
    victoires: 0,
    nuls: 0,
    defaites: 0,
    butsMarques: 0,
    butsConcedes: 0,
    diffGenerale: 0,
    diffParticuliere: 0,
    nbFeminines: 0,
    rang: 1,
    ...overrides,
  };
}

function buildMatchFinale(overrides: Partial<MatchFinale> = {}): MatchFinale {
  return {
    id: 'match-1',
    type: 'demi_finale_a',
    equipeAId: 'equipe-1',
    equipeBId: 'equipe-4',
    scoreA: null,
    scoreB: null,
    statut: 'a_jouer',
    ...overrides,
  };
}

describe('DemarrerPhaseFinaleUseCase', () => {
  let cycleTournoiRepository: jest.Mocked<CycleTournoiRepository>;
  let phaseFinaleRepository: jest.Mocked<PhaseFinaleRepository>;
  let matchFinaleRepository: jest.Mocked<MatchFinaleRepository>;
  let phaseFinaleService: jest.Mocked<PhaseFinaleService>;
  let useCase: DemarrerPhaseFinaleUseCase;

  beforeEach(() => {
    cycleTournoiRepository = {
      estPhaseFinaleDeclenchee: jest.fn(),
      declencherPhaseFinale: jest.fn(),
      obtenirClassementFinalPoules: jest.fn(),
    };
    phaseFinaleRepository = {
      obtenir: jest.fn(),
      save: jest.fn(async (entity: PhaseFinale) => entity),
    };
    matchFinaleRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(async (entity: MatchFinale) => entity),
    };
    phaseFinaleService = {
      creerDemiFinales: jest.fn(),
      determinerVainqueurEtVaincu: jest.fn(),
      creerFinales: jest.fn(),
    } as unknown as jest.Mocked<PhaseFinaleService>;

    useCase = new DemarrerPhaseFinaleUseCase(
      cycleTournoiRepository,
      phaseFinaleRepository,
      matchFinaleRepository,
      phaseFinaleService,
    );
  });

  it("lève BadRequestException si la phase de poules n'est pas terminée", async () => {
    cycleTournoiRepository.estPhaseFinaleDeclenchee.mockResolvedValue(false);

    await expect(useCase.execute()).rejects.toThrow(BadRequestException);
    await expect(useCase.execute()).rejects.toThrow("La phase de poules n'est pas terminée");
    expect(phaseFinaleRepository.obtenir).not.toHaveBeenCalled();
  });

  it('lève ConflictException si la phase finale a déjà été démarrée', async () => {
    cycleTournoiRepository.estPhaseFinaleDeclenchee.mockResolvedValue(true);
    phaseFinaleRepository.obtenir.mockResolvedValue({
      id: 'phase-1',
      demiFinaleAId: 'demi-a',
      demiFinaleBId: 'demi-b',
      finaleCardebatId: null,
      finaleLeGallId: null,
      statut: 'en_cours',
    });

    await expect(useCase.execute()).rejects.toThrow(ConflictException);
    await expect(useCase.execute()).rejects.toThrow('La phase finale a déjà été démarrée');
    expect(cycleTournoiRepository.obtenirClassementFinalPoules).not.toHaveBeenCalled();
  });

  it('lève BadRequestException si le classement final de poules est null', async () => {
    cycleTournoiRepository.estPhaseFinaleDeclenchee.mockResolvedValue(true);
    phaseFinaleRepository.obtenir.mockResolvedValue(null);
    cycleTournoiRepository.obtenirClassementFinalPoules.mockResolvedValue(null);

    await expect(useCase.execute()).rejects.toThrow(BadRequestException);
    await expect(useCase.execute()).rejects.toThrow(
      'Classement final insuffisant pour démarrer la phase finale',
    );
    expect(phaseFinaleService.creerDemiFinales).not.toHaveBeenCalled();
  });

  it('lève BadRequestException si le classement final de poules contient moins de 4 équipes', async () => {
    cycleTournoiRepository.estPhaseFinaleDeclenchee.mockResolvedValue(true);
    phaseFinaleRepository.obtenir.mockResolvedValue(null);
    cycleTournoiRepository.obtenirClassementFinalPoules.mockResolvedValue([
      buildClassementEntry({ equipeId: 'equipe-1', rang: 1 }),
      buildClassementEntry({ equipeId: 'equipe-2', rang: 2 }),
      buildClassementEntry({ equipeId: 'equipe-3', rang: 3 }),
    ]);

    await expect(useCase.execute()).rejects.toThrow(BadRequestException);
    expect(phaseFinaleService.creerDemiFinales).not.toHaveBeenCalled();
  });

  it('crée et persiste les deux demi-finales et la phase finale (statut en_cours, finales à null)', async () => {
    cycleTournoiRepository.estPhaseFinaleDeclenchee.mockResolvedValue(true);
    phaseFinaleRepository.obtenir.mockResolvedValue(null);
    const classementFinal = [
      buildClassementEntry({ equipeId: 'equipe-1', rang: 1 }),
      buildClassementEntry({ equipeId: 'equipe-2', rang: 2 }),
      buildClassementEntry({ equipeId: 'equipe-3', rang: 3 }),
      buildClassementEntry({ equipeId: 'equipe-4', rang: 4 }),
    ];
    cycleTournoiRepository.obtenirClassementFinalPoules.mockResolvedValue(classementFinal);

    const demiFinaleA = buildMatchFinale({ id: 'demi-a', type: 'demi_finale_a' });
    const demiFinaleB = buildMatchFinale({ id: 'demi-b', type: 'demi_finale_b' });
    phaseFinaleService.creerDemiFinales.mockReturnValue({ demiFinaleA, demiFinaleB });

    const result = await useCase.execute();

    expect(phaseFinaleService.creerDemiFinales).toHaveBeenCalledWith(classementFinal);
    expect(matchFinaleRepository.save).toHaveBeenCalledWith(demiFinaleA);
    expect(matchFinaleRepository.save).toHaveBeenCalledWith(demiFinaleB);
    expect(phaseFinaleRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        demiFinaleAId: 'demi-a',
        demiFinaleBId: 'demi-b',
        finaleCardebatId: null,
        finaleLeGallId: null,
        statut: 'en_cours',
      }),
    );

    expect(result).toEqual({
      demarree: true,
      statut: 'en_cours',
      demiFinaleA: { ...demiFinaleA },
      demiFinaleB: { ...demiFinaleB },
      finaleCardebat: null,
      finaleLeGall: null,
    });
  });
});
