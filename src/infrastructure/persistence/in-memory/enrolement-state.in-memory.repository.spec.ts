import { EnrolementStateInMemoryRepository } from './enrolement-state.in-memory.repository';

describe('EnrolementStateInMemoryRepository', () => {
  it('isCloture() retourne false par défaut puis true après cloturer()', async () => {
    const repo = new EnrolementStateInMemoryRepository();

    expect(await repo.isCloture()).toBe(false);

    await repo.cloturer();

    expect(await repo.isCloture()).toBe(true);
  });

  it('decloturer() repasse isCloture() à false après une clôture', async () => {
    const repo = new EnrolementStateInMemoryRepository();
    await repo.cloturer();
    expect(await repo.isCloture()).toBe(true);

    await repo.decloturer();

    expect(await repo.isCloture()).toBe(false);
  });
});
