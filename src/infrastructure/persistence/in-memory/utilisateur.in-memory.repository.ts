import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  RoleUtilisateur,
  Utilisateur,
} from '../../../domain/utilisateur/entities/utilisateur.entity';
import { UtilisateurRepository } from '../../../domain/utilisateur/repositories/utilisateur.repository.interface';

const SEED_UTILISATEURS: ReadonlyArray<
  Pick<Utilisateur, 'providerId' | 'provider' | 'displayName' | 'email' | 'role' | 'derniereConnexion'>
> = [
  {
    providerId: 'demo-admin',
    provider: 'google',
    displayName: 'Admin Démo',
    email: 'admin.demo@orange.com',
    role: 'admin',
  },
  {
    providerId: 'demo-capitaine',
    provider: 'google',
    displayName: 'Capitaine Démo',
    email: 'capitaine.demo@orange.com',
    role: 'membre',
  },
  {
    providerId: 'demo-organisateur',
    provider: 'google',
    displayName: 'Organisateur Démo',
    email: 'organisateur.demo@orange.com',
    role: 'membre',
  },
  {
    providerId: 'demo-joueur',
    provider: 'google',
    displayName: 'Joueur Démo',
    role: 'membre',
  },
];

@Injectable()
export class UtilisateurInMemoryRepository implements UtilisateurRepository {
  private readonly utilisateurs = new Map<string, Utilisateur>();

  constructor() {
    const dateApparition = new Date().toISOString();
    for (const seed of SEED_UTILISATEURS) {
      const id = randomUUID();
      this.utilisateurs.set(id, {
        id,
        ...seed,
        dateApparition,
      });
    }
  }

  async findAll(): Promise<Utilisateur[]> {
    return [...this.utilisateurs.values()];
  }

  async findById(id: string): Promise<Utilisateur | null> {
    return this.utilisateurs.get(id) ?? null;
  }

  async save(entity: Utilisateur): Promise<Utilisateur> {
    this.utilisateurs.set(entity.id, entity);
    return entity;
  }

  async findByProviderId(providerId: string): Promise<Utilisateur | null> {
    return [...this.utilisateurs.values()].find((u) => u.providerId === providerId) ?? null;
  }

  async updateRole(id: string, role: RoleUtilisateur): Promise<Utilisateur> {
    const utilisateur = this.utilisateurs.get(id);
    if (!utilisateur) {
      throw new NotFoundException(`Utilisateur ${id} introuvable`);
    }
    const updated: Utilisateur = { ...utilisateur, role };
    this.utilisateurs.set(id, updated);
    return updated;
  }
}
