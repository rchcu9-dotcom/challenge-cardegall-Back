import { Equipe } from '../../equipe/entities/equipe.entity';
import { EquipeRepository } from '../../equipe/repositories/equipe.repository.interface';
import { Tour } from '../../tour/entities/tour.entity';
import { TourRepository } from '../../tour/repositories/tour.repository.interface';
import { Match } from '../../match/entities/match.entity';
import { MatchRepository } from '../../match/repositories/match.repository.interface';
import { Repository } from '../repositories/repository.interface';

class InMemoryEquipeRepository implements EquipeRepository {
  private readonly equipes = new Map<string, Equipe>();

  async findAll(): Promise<Equipe[]> {
    return Array.from(this.equipes.values());
  }

  async findById(id: string): Promise<Equipe | null> {
    return this.equipes.get(id) ?? null;
  }

  async save(equipe: Equipe): Promise<Equipe> {
    this.equipes.set(equipe.id, equipe);
    return equipe;
  }

  async findEnroleesOrdered(): Promise<Equipe[]> {
    return Array.from(this.equipes.values())
      .filter((e) => e.statut === 'enrolee' || e.statut === 'engagee')
      .sort((a, b) => (a.ordreArrivee ?? 0) - (b.ordreArrivee ?? 0));
  }

  async reorder(orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, index) => {
      const equipe = this.equipes.get(id);
      if (equipe) {
        equipe.ordreArrivee = index + 1;
      }
    });
  }
}

class InMemoryTourRepository implements TourRepository {
  private readonly tours = new Map<string, Tour>();

  async findAll(): Promise<Tour[]> {
    return Array.from(this.tours.values()).sort((a, b) => a.numero - b.numero);
  }

  async findById(id: string): Promise<Tour | null> {
    return this.tours.get(id) ?? null;
  }

  async save(tour: Tour): Promise<Tour> {
    this.tours.set(tour.id, tour);
    return tour;
  }

  async findCurrent(): Promise<Tour | null> {
    return Array.from(this.tours.values()).find((t) => t.statut === 'en_cours') ?? null;
  }

  async findLast(): Promise<Tour | null> {
    const tours = await this.findAll();
    return tours.length > 0 ? tours[tours.length - 1] : null;
  }
}

class InMemoryMatchRepository implements MatchRepository {
  private readonly matches = new Map<string, Match>();

  async findAll(): Promise<Match[]> {
    return Array.from(this.matches.values());
  }

  async findById(id: string): Promise<Match | null> {
    return this.matches.get(id) ?? null;
  }

  async save(match: Match): Promise<Match> {
    this.matches.set(match.id, match);
    return match;
  }

  async saveMany(matches: Match[]): Promise<Match[]> {
    return Promise.all(matches.map((m) => this.save(m)));
  }

  async findByTour(tourId: string): Promise<Match[]> {
    return Array.from(this.matches.values()).filter((m) => m.tourId === tourId);
  }
}

function equipe(overrides: Partial<Equipe>): Equipe {
  return {
    id: 'equipe-x',
    nom: 'Équipe X',
    capitaineUserId: 'user-x',
    nbJoueursApprox: 8,
    nbFemininesEnvisage: 2,
    statut: 'enrolee',
    dateInscription: '2026-06-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('Domaine partagé — interfaces de repository (implémentations in-memory de test)', () => {
  it('EquipeRepository : save/findById/findAll respectent Repository<Equipe>', async () => {
    const repo: Repository<Equipe> = new InMemoryEquipeRepository();

    await repo.save(equipe({ id: 'equipe-1', ordreArrivee: 1 }));
    await repo.save(equipe({ id: 'equipe-2', ordreArrivee: 2 }));

    expect(await repo.findById('equipe-1')).not.toBeNull();
    expect(await repo.findById('inconnue')).toBeNull();
    expect(await repo.findAll()).toHaveLength(2);
  });

  it('EquipeRepository : findEnroleesOrdered et reorder respectent ordreArrivee', async () => {
    const repo = new InMemoryEquipeRepository();
    await repo.save(equipe({ id: 'equipe-1', statut: 'enrolee', ordreArrivee: 2 }));
    await repo.save(equipe({ id: 'equipe-2', statut: 'enrolee', ordreArrivee: 1 }));
    await repo.save(equipe({ id: 'equipe-3', statut: 'inscrite', ordreArrivee: undefined }));

    const enrolees = await repo.findEnroleesOrdered();
    expect(enrolees.map((e) => e.id)).toEqual(['equipe-2', 'equipe-1']);

    await repo.reorder(['equipe-1', 'equipe-2']);
    const reordonnees = await repo.findEnroleesOrdered();
    expect(reordonnees.map((e) => e.id)).toEqual(['equipe-1', 'equipe-2']);
  });

  it('TourRepository : findCurrent et findLast pour le préremplissage des paramètres', async () => {
    const repo: TourRepository = new InMemoryTourRepository();
    const parametres = {
      nomsTerrains: ['A', 'B'],
      dureeMatchMinutes: 10,
      latenceMinutes: 2,
      delaiDemarrageMinutes: 3,
    };

    await repo.save({ id: 'tour-1', numero: 1, statut: 'termine', parametres, equipesBecot: [] });
    await repo.save({ id: 'tour-2', numero: 2, statut: 'en_cours', parametres, equipesBecot: [] });

    expect((await repo.findCurrent())?.id).toBe('tour-2');
    expect((await repo.findLast())?.numero).toBe(2);
  });

  it('MatchRepository : saveMany et findByTour filtrent par tour', async () => {
    const repo: MatchRepository = new InMemoryMatchRepository();
    const matchTour1: Match = {
      id: 'match-1',
      tourId: 'tour-1',
      equipeAId: 'equipe-1',
      equipeBId: 'equipe-2',
      estBye: false,
      terrain: 'A',
      heureDebutPrevue: null,
      heureFinPrevue: null,
      scoreA: null,
      scoreB: null,
      statut: 'a_jouer',
    };
    const matchTour2: Match = { ...matchTour1, id: 'match-2', tourId: 'tour-2' };

    await repo.saveMany([matchTour1, matchTour2]);

    expect(await repo.findByTour('tour-1')).toEqual([matchTour1]);
    expect(await repo.findByTour('tour-2')).toEqual([matchTour2]);
    expect(await repo.findAll()).toHaveLength(2);
  });
});
