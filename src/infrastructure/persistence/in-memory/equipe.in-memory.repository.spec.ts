import { EquipeInMemoryRepository } from './equipe.in-memory.repository';

describe('EquipeInMemoryRepository', () => {
  it('est seedée avec 6 équipes au statut "inscrite"', async () => {
    const repo = new EquipeInMemoryRepository();

    const equipes = await repo.findAll();

    expect(equipes).toHaveLength(6);
    expect(equipes.every((equipe) => equipe.statut === 'inscrite')).toBe(true);
    expect(equipes.map((equipe) => equipe.nom)).toEqual([
      'DSI',
      'Marketing',
      'Finance',
      'RH',
      'Commerce',
      'Support',
    ]);
  });

  it('findById retourne null pour un identifiant inconnu', async () => {
    const repo = new EquipeInMemoryRepository();

    expect(await repo.findById('inconnue')).toBeNull();
  });

  it('save met à jour une équipe existante', async () => {
    const repo = new EquipeInMemoryRepository();
    const [equipe] = await repo.findAll();

    const updated = await repo.save({
      ...equipe,
      statut: 'enrolee',
      nbFemininesReel: 3,
      ordreArrivee: 1,
      dateEnrolement: '2026-06-13T08:00:00.000Z',
    });

    expect(updated.statut).toBe('enrolee');
    expect(await repo.findById(equipe.id)).toMatchObject({
      statut: 'enrolee',
      ordreArrivee: 1,
      nbFemininesReel: 3,
    });
  });

  it('findEnroleesOrdered filtre par statut "enrolee" et trie par ordreArrivee', async () => {
    const repo = new EquipeInMemoryRepository();
    const equipes = await repo.findAll();

    await repo.save({ ...equipes[0], statut: 'enrolee', ordreArrivee: 2, nbFemininesReel: 3 });
    await repo.save({ ...equipes[1], statut: 'enrolee', ordreArrivee: 1, nbFemininesReel: 4 });
    // Reste "inscrite", ne doit pas apparaître dans la liste enrôlée.
    await repo.save({ ...equipes[2] });

    const enrolees = await repo.findEnroleesOrdered();

    expect(enrolees.map((equipe) => equipe.id)).toEqual([equipes[1].id, equipes[0].id]);
  });

  it('reorder réassigne ordreArrivee selon orderedIds', async () => {
    const repo = new EquipeInMemoryRepository();
    const equipes = await repo.findAll();
    await repo.save({ ...equipes[0], statut: 'enrolee', ordreArrivee: 1, nbFemininesReel: 3 });
    await repo.save({ ...equipes[1], statut: 'enrolee', ordreArrivee: 2, nbFemininesReel: 4 });

    await repo.reorder([equipes[1].id, equipes[0].id]);

    const enrolees = await repo.findEnroleesOrdered();
    expect(enrolees.map((equipe) => equipe.id)).toEqual([equipes[1].id, equipes[0].id]);
    expect(enrolees.map((equipe) => equipe.ordreArrivee)).toEqual([1, 2]);
  });
});
