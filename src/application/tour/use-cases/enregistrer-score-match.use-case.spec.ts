import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EnregistrerScoreMatchUseCase } from './enregistrer-score-match.use-case';
import { ObtenirTourCourantUseCase } from './obtenir-tour-courant.use-case';
import type { MatchRepository } from '../../../domain/match/repositories/match.repository.interface';
import { Match } from '../../../domain/match/entities/match.entity';
import { TourCourantDto } from '../dto/tour-courant.dto';

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    tourId: 'tour-1',
    equipeAId: 'equipe-1',
    equipeBId: 'equipe-2',
    estBye: false,
    terrain: null,
    heureDebutPrevue: null,
    heureFinPrevue: null,
    scoreA: null,
    scoreB: null,
    statut: 'a_jouer',
    ...overrides,
  };
}

const TOUR_COURANT_DTO_PLACEHOLDER: TourCourantDto = {
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

describe('EnregistrerScoreMatchUseCase', () => {
  let matchRepository: jest.Mocked<MatchRepository>;
  let obtenirTourCourantUseCase: jest.Mocked<ObtenirTourCourantUseCase>;
  let useCase: EnregistrerScoreMatchUseCase;

  beforeEach(() => {
    matchRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(async (entity: Match) => entity),
      findByTour: jest.fn(),
      saveMany: jest.fn(),
    };
    obtenirTourCourantUseCase = {
      execute: jest.fn().mockResolvedValue(TOUR_COURANT_DTO_PLACEHOLDER),
    } as unknown as jest.Mocked<ObtenirTourCourantUseCase>;

    useCase = new EnregistrerScoreMatchUseCase(matchRepository, obtenirTourCourantUseCase);
  });

  it("lève NotFoundException si le match n'existe pas", async () => {
    matchRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('inconnu', 2, 1)).rejects.toThrow(NotFoundException);
    expect(matchRepository.save).not.toHaveBeenCalled();
  });

  it('lève BadRequestException si le match est un bye (estBye)', async () => {
    matchRepository.findById.mockResolvedValue(
      buildMatch({ id: 'match-bye', estBye: true, equipeBId: null }),
    );

    await expect(useCase.execute('match-bye', 2, 0)).rejects.toThrow(BadRequestException);
    await expect(useCase.execute('match-bye', 2, 0)).rejects.toThrow(
      "Un match Becot n'a pas de score à saisir",
    );
    expect(matchRepository.save).not.toHaveBeenCalled();
  });

  it('sauvegarde scoreA/scoreB et passe le statut à "termine"', async () => {
    const match = buildMatch({ id: 'match-1', scoreA: null, scoreB: null, statut: 'a_jouer' });
    matchRepository.findById.mockResolvedValue(match);

    await useCase.execute('match-1', 3, 1);

    expect(matchRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'match-1', scoreA: 3, scoreB: 1, statut: 'termine' }),
    );
  });

  it('autorise un score nul (égalité)', async () => {
    const match = buildMatch({ id: 'match-1', statut: 'a_jouer' });
    matchRepository.findById.mockResolvedValue(match);

    await useCase.execute('match-1', 2, 2);

    expect(matchRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ scoreA: 2, scoreB: 2, statut: 'termine' }),
    );
  });

  it('permet de corriger le score d\'un match déjà "termine" (idempotent)', async () => {
    const match = buildMatch({ id: 'match-1', scoreA: 1, scoreB: 0, statut: 'termine' });
    matchRepository.findById.mockResolvedValue(match);

    await useCase.execute('match-1', 2, 2);

    expect(matchRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'match-1', scoreA: 2, scoreB: 2, statut: 'termine' }),
    );
  });

  it('délègue la reconstruction de la réponse à ObtenirTourCourantUseCase', async () => {
    const match = buildMatch({ id: 'match-1' });
    matchRepository.findById.mockResolvedValue(match);

    const result = await useCase.execute('match-1', 3, 1);

    expect(obtenirTourCourantUseCase.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual(TOUR_COURANT_DTO_PLACEHOLDER);
  });
});
