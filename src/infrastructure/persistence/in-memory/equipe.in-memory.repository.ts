import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Equipe } from '../../../domain/equipe/entities/equipe.entity';
import { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';

const SEED_EQUIPES: ReadonlyArray<
  Pick<Equipe, 'nom' | 'capitaineUserId' | 'nbJoueursApprox' | 'nbFemininesEnvisage'>
> = [
  { nom: 'DSI', capitaineUserId: 'demo-dsi', nbJoueursApprox: 10, nbFemininesEnvisage: 3 },
  { nom: 'Marketing', capitaineUserId: 'demo-marketing', nbJoueursApprox: 8, nbFemininesEnvisage: 4 },
  { nom: 'Finance', capitaineUserId: 'demo-finance', nbJoueursApprox: 9, nbFemininesEnvisage: 2 },
  { nom: 'RH', capitaineUserId: 'demo-rh', nbJoueursApprox: 7, nbFemininesEnvisage: 5 },
  { nom: 'Commerce', capitaineUserId: 'demo-commerce', nbJoueursApprox: 10, nbFemininesEnvisage: 3 },
  { nom: 'Support', capitaineUserId: 'demo-support', nbJoueursApprox: 8, nbFemininesEnvisage: 2 },
];

@Injectable()
export class EquipeInMemoryRepository implements EquipeRepository {
  private readonly equipes = new Map<string, Equipe>();

  constructor() {
    const dateInscription = new Date().toISOString();
    for (const seed of SEED_EQUIPES) {
      const id = randomUUID();
      this.equipes.set(id, {
        id,
        ...seed,
        statut: 'inscrite',
        dateInscription,
      });
    }
  }

  async findAll(): Promise<Equipe[]> {
    return [...this.equipes.values()];
  }

  async findById(id: string): Promise<Equipe | null> {
    return this.equipes.get(id) ?? null;
  }

  async save(entity: Equipe): Promise<Equipe> {
    this.equipes.set(entity.id, entity);
    return entity;
  }

  async findEnroleesOrdered(): Promise<Equipe[]> {
    return [...this.equipes.values()]
      .filter((equipe) => equipe.statut === 'enrolee')
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
