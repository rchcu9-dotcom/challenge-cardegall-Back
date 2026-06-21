import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Tour } from '../../../domain/tour/entities/tour.entity';
import { TourRepository } from '../../../domain/tour/repositories/tour.repository.interface';

export const TOUR_1_PARAMETRES_SEED = {
  nomsTerrains: ['A', 'B'],
  dureeMatchMinutes: 15,
  latenceMinutes: 5,
  delaiDemarrageMinutes: 3,
};

@Injectable()
export class TourInMemoryRepository implements TourRepository {
  private readonly tours = new Map<string, Tour>();

  constructor() {
    const tour1Id = randomUUID();
    this.tours.set(tour1Id, {
      id: tour1Id,
      numero: 1,
      statut: 'en_cours',
      parametres: { ...TOUR_1_PARAMETRES_SEED, nomsTerrains: [...TOUR_1_PARAMETRES_SEED.nomsTerrains] },
      equipesBecot: [],
    });
  }

  async findAll(): Promise<Tour[]> {
    return [...this.tours.values()];
  }

  async findById(id: string): Promise<Tour | null> {
    return this.tours.get(id) ?? null;
  }

  async save(entity: Tour): Promise<Tour> {
    this.tours.set(entity.id, entity);
    return entity;
  }

  async findCurrent(): Promise<Tour | null> {
    const enCours = [...this.tours.values()].find((tour) => tour.statut === 'en_cours');
    if (enCours) {
      return enCours;
    }
    return this.findLast();
  }

  async findLast(): Promise<Tour | null> {
    const tours = [...this.tours.values()];
    if (tours.length === 0) {
      return null;
    }
    return tours.reduce((latest, tour) => (tour.numero > latest.numero ? tour : latest));
  }

  async deleteById(id: string): Promise<void> {
    this.tours.delete(id);
  }
}
