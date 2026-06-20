import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EnregistrerScoreMatchFinaleUseCase } from './enregistrer-score-match-finale.use-case';
import { ObtenirPhaseFinaleUseCase } from './obtenir-phase-finale.use-case';
import type { MatchFinaleRepository } from '../../../domain/finale/repositories/match-finale.repository.interface';
import type { PhaseFinaleRepository } from '../../../domain/finale/repositories/phase-finale.repository.interface';
import { PhaseFinaleService } from '../../../domain/finale/services/phase-finale.service';
import { MatchFinale } from '../../../domain/finale/entities/match-finale.entity';
import { PhaseFinale } from '../../../domain/finale/entities/phase-finale.entity';
import { PhaseFinaleDto } from '../dto/phase-finale.dto';

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

function buildPhaseFinale(overrides: Partial<PhaseFinale> = {}): PhaseFinale {
  return {
    id: 'phase-1',
    demiFinaleAId: 'demi-a',
    demiFinaleBId: 'demi-b',
    finaleCardebatId: null,
    finaleLeGallId: null,
    statut: 'en_cours',
    ...overrides,
  };
}

const PHASE_FINALE_DTO_PLACEHOLDER: PhaseFinaleDto = {
  demarree: true,
  statut: 'en_cours',
  demiFinaleA: null,
  demiFinaleB: null,
  finaleCardebat: null,
  finaleLeGall: null,
};

describe('EnregistrerScoreMatchFinaleUseCase', () => {
  let matchFinaleRepository: jest.Mocked<MatchFinaleRepository>;
  let phaseFinaleRepository: jest.Mocked<PhaseFinaleRepository>;
  let phaseFinaleService: PhaseFinaleService;
  let obtenirPhaseFinaleUseCase: jest.Mocked<ObtenirPhaseFinaleUseCase>;
  let useCase: EnregistrerScoreMatchFinaleUseCase;

  beforeEach(() => {
    matchFinaleRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(async (entity: MatchFinale) => entity),
    };
    phaseFinaleRepository = {
      obtenir: jest.fn(),
      save: jest.fn(async (entity: PhaseFinale) => entity),
    };
    // Service réel : logique pure, pas de dépendance infra, plus simple à tester via l'effet réel.
    phaseFinaleService = new PhaseFinaleService();
    obtenirPhaseFinaleUseCase = {
      execute: jest.fn().mockResolvedValue(PHASE_FINALE_DTO_PLACEHOLDER),
    } as unknown as jest.Mocked<ObtenirPhaseFinaleUseCase>;

    useCase = new EnregistrerScoreMatchFinaleUseCase(
      matchFinaleRepository,
      phaseFinaleRepository,
      phaseFinaleService,
      obtenirPhaseFinaleUseCase,
    );
  });

  it("lève NotFoundException si le match de phase finale n'existe pas", async () => {
    matchFinaleRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('inconnu', 2, 1)).rejects.toThrow(NotFoundException);
    expect(matchFinaleRepository.save).not.toHaveBeenCalled();
  });

  it('lève BadRequestException si scoreA === scoreB', async () => {
    matchFinaleRepository.findById.mockResolvedValue(buildMatchFinale());

    await expect(useCase.execute('match-1', 2, 2)).rejects.toThrow(BadRequestException);
    await expect(useCase.execute('match-1', 2, 2)).rejects.toThrow(
      'Un match de phase finale ne peut pas se terminer sur un score nul',
    );
    expect(matchFinaleRepository.save).not.toHaveBeenCalled();
  });

  it('sauvegarde le score et passe le statut à "termine"', async () => {
    const match = buildMatchFinale({ id: 'match-1', scoreA: null, scoreB: null, statut: 'a_jouer' });
    matchFinaleRepository.findById.mockResolvedValue(match);
    phaseFinaleRepository.obtenir.mockResolvedValue(null);

    await useCase.execute('match-1', 3, 1);

    expect(matchFinaleRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'match-1', scoreA: 3, scoreB: 1, statut: 'termine' }),
    );
  });

  it("retourne directement le résultat de ObtenirPhaseFinaleUseCase si aucune PhaseFinale n'existe", async () => {
    const match = buildMatchFinale({ id: 'match-1' });
    matchFinaleRepository.findById.mockResolvedValue(match);
    phaseFinaleRepository.obtenir.mockResolvedValue(null);

    const result = await useCase.execute('match-1', 3, 1);

    expect(phaseFinaleRepository.save).not.toHaveBeenCalled();
    expect(obtenirPhaseFinaleUseCase.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual(PHASE_FINALE_DTO_PLACEHOLDER);
  });

  describe('progression du bracket — demi-finales', () => {
    it("ne crée pas les finales si l'autre demi-finale n'est pas encore terminée", async () => {
      const demiFinaleA = buildMatchFinale({
        id: 'demi-a',
        type: 'demi_finale_a',
        equipeAId: 'equipe-1',
        equipeBId: 'equipe-4',
        statut: 'a_jouer',
      });
      const demiFinaleB = buildMatchFinale({
        id: 'demi-b',
        type: 'demi_finale_b',
        equipeAId: 'equipe-2',
        equipeBId: 'equipe-3',
        scoreA: null,
        scoreB: null,
        statut: 'a_jouer',
      });
      const phaseFinale = buildPhaseFinale({ demiFinaleAId: 'demi-a', demiFinaleBId: 'demi-b' });

      matchFinaleRepository.findById.mockImplementation(async (id: string) => {
        if (id === 'demi-a') return demiFinaleA;
        if (id === 'demi-b') return demiFinaleB;
        return null;
      });
      phaseFinaleRepository.obtenir.mockResolvedValue(phaseFinale);

      await useCase.execute('demi-a', 3, 1);

      // Seul le match modifié est sauvegardé, aucune finale créée
      expect(matchFinaleRepository.save).toHaveBeenCalledTimes(1);
      expect(phaseFinaleRepository.save).not.toHaveBeenCalled();
    });

    it('crée les deux finales (Cardebat et Le Gall) une fois les deux demi-finales terminées', async () => {
      const demiFinaleA = buildMatchFinale({
        id: 'demi-a',
        type: 'demi_finale_a',
        equipeAId: 'equipe-1',
        equipeBId: 'equipe-4',
        statut: 'a_jouer',
      });
      const demiFinaleBTerminee = buildMatchFinale({
        id: 'demi-b',
        type: 'demi_finale_b',
        equipeAId: 'equipe-2',
        equipeBId: 'equipe-3',
        scoreA: 0,
        scoreB: 2,
        statut: 'termine',
      });
      const phaseFinale = buildPhaseFinale({ demiFinaleAId: 'demi-a', demiFinaleBId: 'demi-b' });

      matchFinaleRepository.findById.mockImplementation(async (id: string) => {
        if (id === 'demi-a') return demiFinaleA;
        if (id === 'demi-b') return demiFinaleBTerminee;
        return null;
      });
      phaseFinaleRepository.obtenir.mockResolvedValue(phaseFinale);

      await useCase.execute('demi-a', 3, 1);

      // demiFinaleA mis à jour + finaleCardebat + finaleLeGall sauvegardés
      expect(matchFinaleRepository.save).toHaveBeenCalledTimes(3);

      const savedTypes = matchFinaleRepository.save.mock.calls.map(([m]) => m.type);
      expect(savedTypes).toEqual(
        expect.arrayContaining(['demi_finale_a', 'finale_cardebat', 'finale_le_gall']),
      );

      const finaleCardebatSaved = matchFinaleRepository.save.mock.calls.find(
        ([m]) => m.type === 'finale_cardebat',
      )?.[0] as MatchFinale;
      const finaleLeGallSaved = matchFinaleRepository.save.mock.calls.find(
        ([m]) => m.type === 'finale_le_gall',
      )?.[0] as MatchFinale;

      // Vainqueurs (equipe-1 a battu equipe-4, equipe-3 a battu equipe-2) -> finale Cardebat
      expect(finaleCardebatSaved).toMatchObject({
        equipeAId: 'equipe-1',
        equipeBId: 'equipe-3',
        statut: 'a_jouer',
        scoreA: null,
        scoreB: null,
      });
      // Vaincus -> petite finale Le Gall
      expect(finaleLeGallSaved).toMatchObject({
        equipeAId: 'equipe-4',
        equipeBId: 'equipe-2',
        statut: 'a_jouer',
        scoreA: null,
        scoreB: null,
      });

      expect(phaseFinaleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          finaleCardebatId: finaleCardebatSaved.id,
          finaleLeGallId: finaleLeGallSaved.id,
        }),
      );
    });

    it('ne recrée pas les finales si elles existent déjà (finaleCardebatId déjà renseigné)', async () => {
      const demiFinaleA = buildMatchFinale({
        id: 'demi-a',
        type: 'demi_finale_a',
        statut: 'a_jouer',
      });
      const demiFinaleB = buildMatchFinale({ id: 'demi-b', type: 'demi_finale_b', statut: 'termine' });
      const phaseFinale = buildPhaseFinale({
        demiFinaleAId: 'demi-a',
        demiFinaleBId: 'demi-b',
        finaleCardebatId: 'finale-cardebat',
        finaleLeGallId: 'finale-le-gall',
      });

      matchFinaleRepository.findById.mockImplementation(async (id: string) => {
        if (id === 'demi-a') return demiFinaleA;
        if (id === 'demi-b') return demiFinaleB;
        return null;
      });
      phaseFinaleRepository.obtenir.mockResolvedValue(phaseFinale);

      await useCase.execute('demi-a', 3, 1);

      expect(matchFinaleRepository.save).toHaveBeenCalledTimes(1);
      expect(phaseFinaleRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('progression du bracket — finales', () => {
    it("ne passe pas la phase finale à 'terminee' si l'autre finale n'est pas encore terminée", async () => {
      const finaleCardebat = buildMatchFinale({
        id: 'finale-cardebat',
        type: 'finale_cardebat',
        equipeAId: 'equipe-1',
        equipeBId: 'equipe-3',
        statut: 'a_jouer',
      });
      const finaleLeGall = buildMatchFinale({
        id: 'finale-le-gall',
        type: 'finale_le_gall',
        equipeAId: 'equipe-4',
        equipeBId: 'equipe-2',
        scoreA: null,
        scoreB: null,
        statut: 'a_jouer',
      });
      const phaseFinale = buildPhaseFinale({
        finaleCardebatId: 'finale-cardebat',
        finaleLeGallId: 'finale-le-gall',
      });

      matchFinaleRepository.findById.mockImplementation(async (id: string) => {
        if (id === 'finale-cardebat') return finaleCardebat;
        if (id === 'finale-le-gall') return finaleLeGall;
        return null;
      });
      phaseFinaleRepository.obtenir.mockResolvedValue(phaseFinale);

      await useCase.execute('finale-cardebat', 2, 1);

      expect(phaseFinaleRepository.save).not.toHaveBeenCalled();
    });

    it("passe la phase finale à 'terminee' une fois les deux finales terminées", async () => {
      const finaleCardebat = buildMatchFinale({
        id: 'finale-cardebat',
        type: 'finale_cardebat',
        statut: 'a_jouer',
      });
      const finaleLeGallTerminee = buildMatchFinale({
        id: 'finale-le-gall',
        type: 'finale_le_gall',
        scoreA: 2,
        scoreB: 1,
        statut: 'termine',
      });
      const phaseFinale = buildPhaseFinale({
        finaleCardebatId: 'finale-cardebat',
        finaleLeGallId: 'finale-le-gall',
      });

      matchFinaleRepository.findById.mockImplementation(async (id: string) => {
        if (id === 'finale-cardebat') return finaleCardebat;
        if (id === 'finale-le-gall') return finaleLeGallTerminee;
        return null;
      });
      phaseFinaleRepository.obtenir.mockResolvedValue(phaseFinale);

      await useCase.execute('finale-cardebat', 2, 1);

      expect(phaseFinaleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ statut: 'terminee' }),
      );
    });

    it('retourne le PhaseFinaleDto via ObtenirPhaseFinaleUseCase', async () => {
      const finaleCardebat = buildMatchFinale({ id: 'finale-cardebat', type: 'finale_cardebat', statut: 'a_jouer' });
      const finaleLeGall = buildMatchFinale({ id: 'finale-le-gall', type: 'finale_le_gall', statut: 'a_jouer' });
      const phaseFinale = buildPhaseFinale({
        finaleCardebatId: 'finale-cardebat',
        finaleLeGallId: 'finale-le-gall',
      });

      matchFinaleRepository.findById.mockImplementation(async (id: string) => {
        if (id === 'finale-cardebat') return finaleCardebat;
        if (id === 'finale-le-gall') return finaleLeGall;
        return null;
      });
      phaseFinaleRepository.obtenir.mockResolvedValue(phaseFinale);

      const result = await useCase.execute('finale-cardebat', 2, 1);

      expect(obtenirPhaseFinaleUseCase.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(PHASE_FINALE_DTO_PLACEHOLDER);
    });
  });
});
