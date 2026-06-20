import { PhaseFinaleInMemoryRepository } from './phase-finale.in-memory.repository';
import { PhaseFinale } from '../../../domain/finale/entities/phase-finale.entity';

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

describe('PhaseFinaleInMemoryRepository', () => {
  it('obtenir retourne null avant tout démarrage de la phase finale', async () => {
    const repo = new PhaseFinaleInMemoryRepository();

    expect(await repo.obtenir()).toBeNull();
  });

  it('save persiste la phase finale et obtenir la retourne ensuite', async () => {
    const repo = new PhaseFinaleInMemoryRepository();
    const phaseFinale = buildPhaseFinale();

    const saved = await repo.save(phaseFinale);

    expect(saved).toEqual(phaseFinale);
    expect(await repo.obtenir()).toEqual(phaseFinale);
  });

  it('save remplace la phase finale existante', async () => {
    const repo = new PhaseFinaleInMemoryRepository();
    await repo.save(buildPhaseFinale({ statut: 'en_cours' }));

    await repo.save(buildPhaseFinale({ statut: 'terminee' }));

    expect(await repo.obtenir()).toMatchObject({ statut: 'terminee' });
  });
});
