import { MatchInMemoryRepository } from './match.in-memory.repository';
import { EquipeInMemoryRepository } from './equipe.in-memory.repository';
import { TourInMemoryRepository } from './tour.in-memory.repository';

describe('MatchInMemoryRepository', () => {
  function buildRepo() {
    const equipeRepository = new EquipeInMemoryRepository();
    const tourRepository = new TourInMemoryRepository();
    const matchRepository = new MatchInMemoryRepository(equipeRepository, tourRepository);
    return { equipeRepository, tourRepository, matchRepository };
  }

  it('seed paresseusement 3 matchs (1v2, 3v4, 5v6) du Tour n°1 au premier appel', async () => {
    const { equipeRepository, tourRepository, matchRepository } = buildRepo();

    const equipes = await equipeRepository.findAll();
    const tour1 = await tourRepository.findCurrent();

    const matches = await matchRepository.findAll();

    expect(matches).toHaveLength(3);
    expect(matches.every((match) => match.tourId === tour1?.id)).toBe(true);
    expect(matches.every((match) => match.statut === 'a_jouer')).toBe(true);
    expect(matches.every((match) => !match.estBye)).toBe(true);
    expect(matches.every((match) => match.scoreA === null && match.scoreB === null)).toBe(true);
    expect(matches.every((match) => match.terrain === null)).toBe(true);

    expect(matches.map((m) => [m.equipeAId, m.equipeBId])).toEqual([
      [equipes[0].id, equipes[1].id],
      [equipes[2].id, equipes[3].id],
      [equipes[4].id, equipes[5].id],
    ]);
  });

  it('le seed ne se déclenche qu\'une seule fois (idempotence des appels successifs)', async () => {
    const { matchRepository } = buildRepo();

    const first = await matchRepository.findAll();
    const second = await matchRepository.findAll();

    expect(second).toHaveLength(first.length);
    expect(second.map((m) => m.id)).toEqual(first.map((m) => m.id));
  });

  it('findByTour retourne uniquement les matchs du tour demandé, après seed', async () => {
    const { tourRepository, matchRepository } = buildRepo();
    const tour1 = await tourRepository.findCurrent();

    const matches = await matchRepository.findByTour(tour1!.id);

    expect(matches).toHaveLength(3);
    expect(matches.every((match) => match.tourId === tour1!.id)).toBe(true);
  });

  it('findByTour retourne un tableau vide pour un tour inconnu (après seed)', async () => {
    const { matchRepository } = buildRepo();

    const matches = await matchRepository.findByTour('tour-inconnu');

    expect(matches).toEqual([]);
  });

  it('findById retourne null pour un identifiant inconnu (après seed)', async () => {
    const { matchRepository } = buildRepo();

    expect(await matchRepository.findById('match-inconnu')).toBeNull();
  });

  it('save met à jour un match existant et déclenche le seed si nécessaire', async () => {
    const { matchRepository } = buildRepo();

    const [match] = await matchRepository.findAll();
    const updated = await matchRepository.save({ ...match, statut: 'termine', scoreA: 3, scoreB: 1 });

    expect(updated.statut).toBe('termine');
    expect(await matchRepository.findById(match.id)).toMatchObject({
      statut: 'termine',
      scoreA: 3,
      scoreB: 1,
    });
  });

  it('saveMany ajoute de nouveaux matchs (ex. ceux d\'un nouveau tour) sans dupliquer le seed', async () => {
    const { tourRepository, matchRepository } = buildRepo();
    const tour1 = await tourRepository.findCurrent();
    const seeded = await matchRepository.findAll();

    const nouveauxMatches = [
      {
        id: 'nouveau-match-1',
        tourId: 'tour-2',
        equipeAId: 'equipe-x',
        equipeBId: 'equipe-y',
        estBye: false,
        terrain: null,
        heureDebutPrevue: null,
        heureFinPrevue: null,
        scoreA: null,
        scoreB: null,
        statut: 'a_jouer' as const,
      },
    ];

    await matchRepository.saveMany(nouveauxMatches);

    const all = await matchRepository.findAll();
    expect(all).toHaveLength(seeded.length + 1);
    expect(all.find((m) => m.id === 'nouveau-match-1')).toMatchObject(nouveauxMatches[0]);
    // Le seed du Tour n°1 reste inchangé.
    expect(await matchRepository.findByTour(tour1!.id)).toHaveLength(3);
  });

  it('ne seed aucun match si aucun tour courant n\'existe', async () => {
    const equipeRepository = new EquipeInMemoryRepository();
    const tourRepository = new TourInMemoryRepository();
    // Force findCurrent() à retourner null en clôturant le seul tour seedé puis en
    // simulant l'absence de tour courant/last via un mock.
    jest.spyOn(tourRepository, 'findCurrent').mockResolvedValue(null);

    const matchRepository = new MatchInMemoryRepository(equipeRepository, tourRepository);

    const matches = await matchRepository.findAll();

    expect(matches).toEqual([]);
  });
});
