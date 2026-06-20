import { CycleTournoiInMemoryRepository } from './cycle-tournoi.in-memory.repository';

describe('CycleTournoiInMemoryRepository', () => {
  it('estPhaseFinaleDeclenchee() retourne false par défaut puis true après declencherPhaseFinale()', async () => {
    const repo = new CycleTournoiInMemoryRepository();

    expect(await repo.estPhaseFinaleDeclenchee()).toBe(false);

    await repo.declencherPhaseFinale([]);

    expect(await repo.estPhaseFinaleDeclenchee()).toBe(true);
  });
});
