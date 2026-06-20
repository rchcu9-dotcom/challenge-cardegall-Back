import { MatchFinaleInMemoryRepository } from './match-finale.in-memory.repository';
import { MatchFinale } from '../../../domain/finale/entities/match-finale.entity';

function buildMatchFinale(overrides: Partial<MatchFinale> = {}): MatchFinale {
  return {
    id: 'match-1',
    type: 'demi_finale_a',
    equipeAId: 'equipe-1',
    equipeBId: 'equipe-4',
    scoreA: null,
    scoreB: null,
    statut: 'a_jouer',
    ...overrides,
  };
}

describe('MatchFinaleInMemoryRepository', () => {
  it('est vide au démarrage', async () => {
    const repo = new MatchFinaleInMemoryRepository();

    expect(await repo.findAll()).toEqual([]);
  });

  it('findById retourne null pour un identifiant inconnu', async () => {
    const repo = new MatchFinaleInMemoryRepository();

    expect(await repo.findById('inconnu')).toBeNull();
  });

  it('save persiste et findById/findAll retournent le match sauvegardé', async () => {
    const repo = new MatchFinaleInMemoryRepository();
    const match = buildMatchFinale();

    await repo.save(match);

    expect(await repo.findById('match-1')).toEqual(match);
    expect(await repo.findAll()).toEqual([match]);
  });

  it('save met à jour un match existant (même id)', async () => {
    const repo = new MatchFinaleInMemoryRepository();
    await repo.save(buildMatchFinale({ statut: 'a_jouer', scoreA: null, scoreB: null }));

    const updated = await repo.save(
      buildMatchFinale({ scoreA: 3, scoreB: 1, statut: 'termine' }),
    );

    expect(updated).toMatchObject({ scoreA: 3, scoreB: 1, statut: 'termine' });
    expect(await repo.findAll()).toHaveLength(1);
    expect(await repo.findById('match-1')).toMatchObject({ statut: 'termine' });
  });
});
