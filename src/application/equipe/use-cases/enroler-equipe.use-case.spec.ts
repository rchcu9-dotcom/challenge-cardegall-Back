import { ConflictException, NotFoundException } from '@nestjs/common';
import { EnrolerEquipeUseCase } from './enroler-equipe.use-case';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import type { ClockPort } from '../../../domain/shared/ports/clock.port';
import { Equipe } from '../../../domain/equipe/entities/equipe.entity';

function buildEquipe(overrides: Partial<Equipe> = {}): Equipe {
  return {
    id: 'equipe-1',
    nom: 'DSI',
    capitaineUserId: 'demo-dsi',
    nbJoueursApprox: 10,
    nbFemininesEnvisage: 3,
    statut: 'inscrite',
    dateInscription: '2026-06-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('EnrolerEquipeUseCase', () => {
  let equipes: jest.Mocked<EquipeRepository>;
  let clock: jest.Mocked<ClockPort>;
  let useCase: EnrolerEquipeUseCase;

  beforeEach(() => {
    equipes = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(async (entity) => entity),
      findEnroleesOrdered: jest.fn().mockResolvedValue([]),
      reorder: jest.fn(),
    };
    clock = { now: jest.fn(() => new Date('2026-06-13T08:00:00.000Z')) };
    useCase = new EnrolerEquipeUseCase(equipes, clock);
  });

  it("lève NotFoundException si l'équipe n'existe pas", async () => {
    equipes.findById.mockResolvedValue(null);

    await expect(useCase.execute('inconnue', { nbFemininesReel: 3 })).rejects.toThrow(
      NotFoundException,
    );
    expect(equipes.save).not.toHaveBeenCalled();
  });

  it("lève ConflictException si l'équipe n'est pas au statut \"inscrite\"", async () => {
    equipes.findById.mockResolvedValue(buildEquipe({ statut: 'enrolee' }));

    await expect(useCase.execute('equipe-1', { nbFemininesReel: 3 })).rejects.toThrow(
      ConflictException,
    );
    expect(equipes.save).not.toHaveBeenCalled();
  });

  it('assigne ordreArrivee = 1 pour la première équipe enrôlée', async () => {
    equipes.findById.mockResolvedValue(buildEquipe());
    equipes.findEnroleesOrdered.mockResolvedValue([]);

    const result = await useCase.execute('equipe-1', { nbFemininesReel: 4 });

    expect(result.statut).toBe('enrolee');
    expect(result.ordreArrivee).toBe(1);
    expect(result.nbFemininesReel).toBe(4);
    expect(result.dateEnrolement).toBe('2026-06-13T08:00:00.000Z');
  });

  it('assigne ordreArrivee = max(ordreArrivee existants) + 1 quand des équipes sont déjà enrôlées', async () => {
    equipes.findById.mockResolvedValue(buildEquipe({ id: 'equipe-3' }));
    equipes.findEnroleesOrdered.mockResolvedValue([
      buildEquipe({ id: 'equipe-1', statut: 'enrolee', ordreArrivee: 1 }),
      buildEquipe({ id: 'equipe-2', statut: 'enrolee', ordreArrivee: 2 }),
    ]);

    const result = await useCase.execute('equipe-3', { nbFemininesReel: 2 });

    expect(result.ordreArrivee).toBe(3);
  });
});
