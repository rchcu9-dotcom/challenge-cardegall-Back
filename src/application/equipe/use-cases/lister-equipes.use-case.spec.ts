import { ListerEquipesUseCase } from './lister-equipes.use-case';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import { Equipe } from '../../../domain/equipe/entities/equipe.entity';

describe('ListerEquipesUseCase', () => {
  it('délègue à equipeRepository.findAll() et retourne toutes les équipes, tous statuts', async () => {
    const equipesAttendues: Equipe[] = [
      {
        id: 'equipe-1',
        nom: 'DSI',
        capitaineUserId: 'demo-dsi',
        nbJoueursApprox: 10,
        nbFemininesEnvisage: 3,
        statut: 'inscrite',
        dateInscription: '2026-06-13T00:00:00.000Z',
      },
      {
        id: 'equipe-2',
        nom: 'Marketing',
        capitaineUserId: 'demo-marketing',
        nbJoueursApprox: 8,
        nbFemininesEnvisage: 4,
        statut: 'enrolee',
        nbFemininesReel: 4,
        ordreArrivee: 1,
        dateInscription: '2026-06-13T00:00:00.000Z',
        dateEnrolement: '2026-06-13T08:00:00.000Z',
      },
    ];
    const equipes: jest.Mocked<EquipeRepository> = {
      findAll: jest.fn().mockResolvedValue(equipesAttendues),
      findById: jest.fn(),
      save: jest.fn(),
      findEnroleesOrdered: jest.fn(),
      reorder: jest.fn(),
    };

    const useCase = new ListerEquipesUseCase(equipes);
    const result = await useCase.execute();

    expect(result).toBe(equipesAttendues);
    expect(equipes.findAll).toHaveBeenCalledTimes(1);
  });
});
