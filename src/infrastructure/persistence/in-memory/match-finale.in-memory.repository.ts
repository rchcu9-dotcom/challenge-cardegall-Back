import { Injectable } from '@nestjs/common';
import { MatchFinale } from '../../../domain/finale/entities/match-finale.entity';
import { MatchFinaleRepository } from '../../../domain/finale/repositories/match-finale.repository.interface';

@Injectable()
export class MatchFinaleInMemoryRepository implements MatchFinaleRepository {
  private readonly matches = new Map<string, MatchFinale>();

  async findAll(): Promise<MatchFinale[]> {
    return [...this.matches.values()];
  }

  async findById(id: string): Promise<MatchFinale | null> {
    return this.matches.get(id) ?? null;
  }

  async save(entity: MatchFinale): Promise<MatchFinale> {
    this.matches.set(entity.id, entity);
    return entity;
  }
}
