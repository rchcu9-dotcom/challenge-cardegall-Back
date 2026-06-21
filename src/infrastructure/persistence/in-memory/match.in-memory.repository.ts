import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Match } from '../../../domain/match/entities/match.entity';
import { MatchRepository } from '../../../domain/match/repositories/match.repository.interface';
import type { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import { EQUIPE_REPOSITORY, TOUR_REPOSITORY } from '../../../domain/shared/tokens';
import type { TourRepository } from '../../../domain/tour/repositories/tour.repository.interface';

/**
 * Seed les matchs du Tour n°1 par appariement naïf (1v2, 3v4, 5v6) des 6 équipes
 * seedées par `EquipeInMemoryRepository`, dans leur ordre de seed (nombre pair
 * d'équipes → pas de bye). `terrain`, `heureDebutPrevue`, `heureFinPrevue` = null
 * (planning-terrains non implémenté), cf. décision 5 du track.
 */
@Injectable()
export class MatchInMemoryRepository implements MatchRepository {
  private readonly matches = new Map<string, Match>();
  private seeded = false;

  constructor(
    @Inject(EQUIPE_REPOSITORY) private readonly equipeRepository: EquipeRepository,
    @Inject(TOUR_REPOSITORY) private readonly tourRepository: TourRepository,
  ) {}

  private async ensureSeed(): Promise<void> {
    if (this.seeded) {
      return;
    }
    this.seeded = true;

    const equipes = await this.equipeRepository.findAll();
    const tour = await this.tourRepository.findCurrent();
    if (!tour) {
      return;
    }

    for (let i = 0; i + 1 < equipes.length; i += 2) {
      const id = randomUUID();
      this.matches.set(id, {
        id,
        tourId: tour.id,
        equipeAId: equipes[i].id,
        equipeBId: equipes[i + 1].id,
        estBye: false,
        terrain: null,
        heureDebutPrevue: null,
        heureFinPrevue: null,
        scoreA: null,
        scoreB: null,
        statut: 'a_jouer',
      });
    }
  }

  async findAll(): Promise<Match[]> {
    await this.ensureSeed();
    return [...this.matches.values()];
  }

  async findById(id: string): Promise<Match | null> {
    await this.ensureSeed();
    return this.matches.get(id) ?? null;
  }

  async save(entity: Match): Promise<Match> {
    await this.ensureSeed();
    this.matches.set(entity.id, entity);
    return entity;
  }

  async findByTour(tourId: string): Promise<Match[]> {
    await this.ensureSeed();
    return [...this.matches.values()].filter((match) => match.tourId === tourId);
  }

  async saveMany(matches: Match[]): Promise<Match[]> {
    await this.ensureSeed();
    for (const match of matches) {
      this.matches.set(match.id, match);
    }
    return matches;
  }

  async deleteByTour(tourId: string): Promise<void> {
    await this.ensureSeed();
    for (const [id, match] of this.matches) {
      if (match.tourId === tourId) {
        this.matches.delete(id);
      }
    }
  }
}
