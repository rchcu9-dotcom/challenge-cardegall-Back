import { BadRequestException } from '@nestjs/common';
import { ReordonnerEquipesUseCase } from './reordonner-equipes.use-case';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import { Equipe } from '../../../domain/equipe/entities/equipe.entity';

function buildEquipe(overrides: Partial<Equipe> = {}): Equipe {
  return {
    id: 'equipe-1',
    nom: 'DSI',
    capitaineUserId: 'demo-dsi',
    nbJoueursApprox: 10,
    nbFemininesEnvisage: 3,
    statut: 'enrolee',
    nbFemininesReel: 3,
    dateInscription: '2026-06-13T00:00:00.000Z',
    dateEnrolement: '2026-06-13T08:00:00.000Z',
    ...overrides,
  };
}

describe('ReordonnerEquipesUseCase', () => {
  let equipes: jest.Mocked<EquipeRepository>;
  let useCase: ReordonnerEquipesUseCase;
  const enrolees = [
    buildEquipe({ id: 'equipe-1', ordreArrivee: 1 }),
    buildEquipe({ id: 'equipe-2', ordreArrivee: 2 }),
  ];

  beforeEach(() => {
    equipes = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      findEnroleesOrdered: jest.fn().mockResolvedValue(enrolees),
      reorder: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new ReordonnerEquipesUseCase(equipes);
  });

  it("lève BadRequestException si le nombre d'identifiants ne correspond pas aux équipes enrôlées", async () => {
    await expect(useCase.execute(['equipe-1'])).rejects.toThrow(BadRequestException);
    expect(equipes.reorder).not.toHaveBeenCalled();
  });

  it("lève BadRequestException si un identifiant ne correspond à aucune équipe enrôlée", async () => {
    await expect(useCase.execute(['equipe-1', 'inconnue'])).rejects.toThrow(BadRequestException);
    expect(equipes.reorder).not.toHaveBeenCalled();
  });

  it('réordonne via le repository et retourne la liste mise à jour', async () => {
    const reordered = [enrolees[1], enrolees[0]];
    equipes.findEnroleesOrdered
      .mockResolvedValueOnce(enrolees)
      .mockResolvedValueOnce(reordered);

    const result = await useCase.execute(['equipe-2', 'equipe-1']);

    expect(equipes.reorder).toHaveBeenCalledWith(['equipe-2', 'equipe-1']);
    expect(result).toBe(reordered);
  });
});
