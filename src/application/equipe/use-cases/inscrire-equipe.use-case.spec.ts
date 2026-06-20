import { BadRequestException } from '@nestjs/common';
import { InscrireEquipeUseCase } from './inscrire-equipe.use-case';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import type { EnrolementStateRepository } from '../../../domain/equipe/repositories/enrolement-state.repository.interface';
import type { ClockPort } from '../../../domain/shared/ports/clock.port';
import { InscrireEquipeDto } from '../dto/inscrire-equipe.dto';

describe('InscrireEquipeUseCase', () => {
  let equipes: jest.Mocked<EquipeRepository>;
  let clock: jest.Mocked<ClockPort>;
  let enrolementState: jest.Mocked<EnrolementStateRepository>;
  let useCase: InscrireEquipeUseCase;

  beforeEach(() => {
    equipes = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(async (entity) => entity),
      findEnroleesOrdered: jest.fn(),
      reorder: jest.fn(),
    };
    clock = { now: jest.fn(() => new Date('2026-06-13T08:00:00.000Z')) };
    enrolementState = {
      isCloture: jest.fn().mockResolvedValue(false),
      cloturer: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new InscrireEquipeUseCase(equipes, clock, enrolementState);
  });

  it('crée une équipe au statut "inscrite" avec dateInscription = clock.now()', async () => {
    const dto: InscrireEquipeDto = {
      nom: 'Logistique',
      capitaineUserId: 'demo-logistique',
      capitainePseudo: 'CapiLogistique',
      nbJoueursApprox: 9,
      nbFemininesEnvisage: 3,
      commentaire: 'Arrivée tardive prévue',
    };

    const result = await useCase.execute(dto);

    expect(result).toMatchObject({
      nom: 'Logistique',
      capitaineUserId: 'demo-logistique',
      capitainePseudo: 'CapiLogistique',
      nbJoueursApprox: 9,
      nbFemininesEnvisage: 3,
      commentaire: 'Arrivée tardive prévue',
      statut: 'inscrite',
      dateInscription: '2026-06-13T08:00:00.000Z',
    });
    expect(typeof result.id).toBe('string');
    expect(result.id.length).toBeGreaterThan(0);
    expect(equipes.save).toHaveBeenCalledWith(result);
  });

  it('laisse commentaire indéfini quand il est absent du DTO', async () => {
    const dto: InscrireEquipeDto = {
      nom: 'Support',
      capitaineUserId: 'demo-support',
      capitainePseudo: 'CapiSupport',
      nbJoueursApprox: 8,
      nbFemininesEnvisage: 2,
    };

    const result = await useCase.execute(dto);

    expect(result.commentaire).toBeUndefined();
  });

  it('lève BadRequestException si les enrôlements sont clôturés, sans appeler equipes.save', async () => {
    enrolementState.isCloture.mockResolvedValue(true);

    const dto: InscrireEquipeDto = {
      nom: 'Support',
      capitaineUserId: 'demo-support',
      capitainePseudo: 'CapiSupport',
      nbJoueursApprox: 8,
      nbFemininesEnvisage: 2,
    };

    await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
    expect(equipes.save).not.toHaveBeenCalled();
  });
});
