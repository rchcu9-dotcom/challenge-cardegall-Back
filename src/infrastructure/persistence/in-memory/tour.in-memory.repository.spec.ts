import { TOUR_1_PARAMETRES_SEED, TourInMemoryRepository } from './tour.in-memory.repository';

describe('TourInMemoryRepository', () => {
  it('est seedée avec un Tour n°1 "en_cours" et les paramètres par défaut', async () => {
    const repo = new TourInMemoryRepository();

    const tours = await repo.findAll();

    expect(tours).toHaveLength(1);
    expect(tours[0]).toMatchObject({
      numero: 1,
      statut: 'en_cours',
      equipesBecot: [],
      parametres: TOUR_1_PARAMETRES_SEED,
    });
  });

  it('findCurrent retourne le tour au statut "en_cours"', async () => {
    const repo = new TourInMemoryRepository();

    const [tour1] = await repo.findAll();
    const current = await repo.findCurrent();

    expect(current).toEqual(tour1);
  });

  it('findCurrent retombe sur findLast si aucun tour n\'est "en_cours"', async () => {
    const repo = new TourInMemoryRepository();
    const [tour1] = await repo.findAll();

    await repo.save({ ...tour1, statut: 'termine' });

    const current = await repo.findCurrent();
    const last = await repo.findLast();

    expect(current).toEqual(last);
    expect(current?.statut).toBe('termine');
  });

  it('findLast retourne le tour avec le numero le plus élevé', async () => {
    const repo = new TourInMemoryRepository();
    const [tour1] = await repo.findAll();

    const tour2 = { ...tour1, id: 'tour-2', numero: 2, statut: 'en_cours' as const };
    await repo.save(tour2);

    const last = await repo.findLast();

    expect(last?.numero).toBe(2);
  });

  it('findById retourne null pour un identifiant inconnu', async () => {
    const repo = new TourInMemoryRepository();

    expect(await repo.findById('inconnu')).toBeNull();
  });

  it('save met à jour un tour existant', async () => {
    const repo = new TourInMemoryRepository();
    const [tour1] = await repo.findAll();

    const updated = await repo.save({ ...tour1, statut: 'termine' });

    expect(updated.statut).toBe('termine');
    expect(await repo.findById(tour1.id)).toMatchObject({ statut: 'termine' });
  });

  it('deleteById supprime le tour correspondant', async () => {
    const repo = new TourInMemoryRepository();
    const [tour1] = await repo.findAll();

    await repo.deleteById(tour1.id);

    expect(await repo.findById(tour1.id)).toBeNull();
    expect(await repo.findAll()).toEqual([]);
  });

  it('deleteById est sans effet sur un identifiant inconnu', async () => {
    const repo = new TourInMemoryRepository();
    const [tour1] = await repo.findAll();

    await repo.deleteById('inconnu');

    expect(await repo.findAll()).toHaveLength(1);
  });
});
