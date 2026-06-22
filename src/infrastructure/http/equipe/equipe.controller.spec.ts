import { Test, TestingModule } from '@nestjs/testing';
import { EquipeController } from './equipe.controller';
import { InscrireEquipeUseCase } from '../../../application/equipe/use-cases/inscrire-equipe.use-case';
import { ListerEquipesUseCase } from '../../../application/equipe/use-cases/lister-equipes.use-case';
import { EnrolerEquipeUseCase } from '../../../application/equipe/use-cases/enroler-equipe.use-case';
import { ReordonnerEquipesUseCase } from '../../../application/equipe/use-cases/reordonner-equipes.use-case';
import { CalculerPlanningProvisoireUseCase } from '../../../application/equipe/use-cases/calculer-planning-provisoire.use-case';
import { CloturerEnrolementsUseCase } from '../../../application/equipe/use-cases/cloturer-enrolements.use-case';
import { DecloturerEnrolementsUseCase } from '../../../application/equipe/use-cases/decloturer-enrolements.use-case';
import { ENROLEMENT_STATE_REPOSITORY, EQUIPE_REPOSITORY } from '../../../domain/shared/tokens';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import type { EnrolementStateRepository } from '../../../domain/equipe/repositories/enrolement-state.repository.interface';
import { Equipe } from '../../../domain/equipe/entities/equipe.entity';
import { Tour } from '../../../domain/tour/entities/tour.entity';

function buildEquipe(overrides: Partial<Equipe> = {}): Equipe {
  return {
    id: 'equipe-1',
    nom: 'DSI',
    capitaineUserId: 'demo-dsi',
    capitainePseudo: 'CapiDSI',
    nbJoueursApprox: 10,
    nbFemininesEnvisage: 3,
    statut: 'inscrite',
    dateInscription: '2026-06-13T00:00:00.000Z',
    ...overrides,
  };
}

function buildTour(overrides: Partial<Tour> = {}): Tour {
  return {
    id: 'tour-1',
    numero: 1,
    statut: 'en_cours',
    parametres: {
      nomsTerrains: ['A', 'B'],
      dureeMatchMinutes: 10,
      latenceMinutes: 2,
      delaiDemarrageMinutes: 3,
    },
    equipesBecot: [],
    ...overrides,
  };
}

describe('EquipeController', () => {
  let controller: EquipeController;
  let inscrireEquipeUseCase: jest.Mocked<InscrireEquipeUseCase>;
  let listerEquipesUseCase: jest.Mocked<ListerEquipesUseCase>;
  let enrolerEquipeUseCase: jest.Mocked<EnrolerEquipeUseCase>;
  let reordonnerEquipesUseCase: jest.Mocked<ReordonnerEquipesUseCase>;
  let cloturerEnrolementsUseCase: jest.Mocked<CloturerEnrolementsUseCase>;
  let decloturerEnrolementsUseCase: jest.Mocked<DecloturerEnrolementsUseCase>;
  let calculerPlanningProvisoireUseCase: jest.Mocked<CalculerPlanningProvisoireUseCase>;
  let equipeRepository: jest.Mocked<EquipeRepository>;
  let enrolementStateRepository: jest.Mocked<EnrolementStateRepository>;

  beforeEach(async () => {
    inscrireEquipeUseCase = { execute: jest.fn() } as unknown as jest.Mocked<InscrireEquipeUseCase>;
    listerEquipesUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListerEquipesUseCase>;
    enrolerEquipeUseCase = { execute: jest.fn() } as unknown as jest.Mocked<EnrolerEquipeUseCase>;
    reordonnerEquipesUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ReordonnerEquipesUseCase>;
    cloturerEnrolementsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CloturerEnrolementsUseCase>;
    decloturerEnrolementsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DecloturerEnrolementsUseCase>;
    calculerPlanningProvisoireUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CalculerPlanningProvisoireUseCase>;
    equipeRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      findEnroleesOrdered: jest.fn(),
      reorder: jest.fn(),
    };
    enrolementStateRepository = {
      isCloture: jest.fn(),
      cloturer: jest.fn(),
      decloturer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EquipeController],
      providers: [
        { provide: InscrireEquipeUseCase, useValue: inscrireEquipeUseCase },
        { provide: ListerEquipesUseCase, useValue: listerEquipesUseCase },
        { provide: EnrolerEquipeUseCase, useValue: enrolerEquipeUseCase },
        { provide: ReordonnerEquipesUseCase, useValue: reordonnerEquipesUseCase },
        { provide: CloturerEnrolementsUseCase, useValue: cloturerEnrolementsUseCase },
        { provide: DecloturerEnrolementsUseCase, useValue: decloturerEnrolementsUseCase },
        {
          provide: CalculerPlanningProvisoireUseCase,
          useValue: calculerPlanningProvisoireUseCase,
        },
        { provide: EQUIPE_REPOSITORY, useValue: equipeRepository },
        { provide: ENROLEMENT_STATE_REPOSITORY, useValue: enrolementStateRepository },
      ],
    }).compile();

    controller = module.get(EquipeController);
  });

  it('GET /equipes délègue à ListerEquipesUseCase et retourne des EquipeDto', async () => {
    listerEquipesUseCase.execute.mockResolvedValue([buildEquipe()]);

    const result = await controller.findAll();

    expect(listerEquipesUseCase.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual([buildEquipe()]);
  });

  it('POST /equipes délègue à InscrireEquipeUseCase avec le DTO reçu', async () => {
    const dto = {
      nom: 'Logistique',
      capitaineUserId: 'demo-logistique',
      capitainePseudo: 'CapiLogistique',
      capitaineEmail: 'capitaine.logistique@orange.com',
      nbJoueursApprox: 8,
      nbFemininesEnvisage: 2,
    };
    inscrireEquipeUseCase.execute.mockResolvedValue(
      buildEquipe({ ...dto, id: 'equipe-2', statut: 'inscrite' }),
    );

    const result = await controller.inscrire(dto);

    expect(inscrireEquipeUseCase.execute).toHaveBeenCalledWith(dto);
    expect(result.id).toBe('equipe-2');
    expect(result.statut).toBe('inscrite');
  });

  it('GET /equipes/enrolees délègue à equipeRepository.findEnroleesOrdered()', async () => {
    const enrolee = buildEquipe({ statut: 'enrolee', nbFemininesReel: 3, ordreArrivee: 1 });
    equipeRepository.findEnroleesOrdered.mockResolvedValue([enrolee]);

    const result = await controller.findEnrolees();

    expect(equipeRepository.findEnroleesOrdered).toHaveBeenCalledTimes(1);
    expect(result).toEqual([enrolee]);
  });

  it('GET /equipes/enrolement-etat retourne { cloture } depuis EnrolementStateRepository', async () => {
    enrolementStateRepository.isCloture.mockResolvedValue(true);

    expect(await controller.getEnrolementEtat()).toEqual({ cloture: true });
  });

  it('PATCH /equipes/:id/enroler délègue à EnrolerEquipeUseCase', async () => {
    enrolerEquipeUseCase.execute.mockResolvedValue(
      buildEquipe({ statut: 'enrolee', nbFemininesReel: 4, ordreArrivee: 1 }),
    );

    const result = await controller.enroler('equipe-1', { nbFemininesReel: 4 });

    expect(enrolerEquipeUseCase.execute).toHaveBeenCalledWith('equipe-1', { nbFemininesReel: 4 });
    expect(result.statut).toBe('enrolee');
    expect(result.nbFemininesReel).toBe(4);
  });

  it('PATCH /equipes/reordonner délègue à ReordonnerEquipesUseCase', async () => {
    const reordered = [buildEquipe({ statut: 'enrolee', ordreArrivee: 1 })];
    reordonnerEquipesUseCase.execute.mockResolvedValue(reordered);

    const result = await controller.reordonner({ orderedIds: ['equipe-1'] });

    expect(reordonnerEquipesUseCase.execute).toHaveBeenCalledWith(['equipe-1']);
    expect(result).toEqual(reordered);
  });

  it('POST /equipes/cloturer-enrolements délègue à CloturerEnrolementsUseCase', async () => {
    cloturerEnrolementsUseCase.execute.mockResolvedValue({
      equipes: [buildEquipe({ statut: 'engagee' })],
      cloture: true,
    });

    const result = await controller.cloturer();

    expect(cloturerEnrolementsUseCase.execute).toHaveBeenCalledTimes(1);
    expect(result.cloture).toBe(true);
    expect(result.equipes[0].statut).toBe('engagee');
  });

  it('POST /equipes/decloturer-enrolements délègue à DecloturerEnrolementsUseCase', async () => {
    decloturerEnrolementsUseCase.execute.mockResolvedValue({
      equipes: [buildEquipe({ statut: 'enrolee' })],
      cloture: false,
    });

    const result = await controller.decloturer();

    expect(decloturerEnrolementsUseCase.execute).toHaveBeenCalledTimes(1);
    expect(result.cloture).toBe(false);
    expect(result.equipes[0].statut).toBe('enrolee');
  });

  it('POST /equipes/calculer-planning-provisoire délègue à CalculerPlanningProvisoireUseCase et retourne le TourDto', async () => {
    calculerPlanningProvisoireUseCase.execute.mockResolvedValue(buildTour());

    const result = await controller.calculerPlanningProvisoire();

    expect(calculerPlanningProvisoireUseCase.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual(buildTour());
  });
});
