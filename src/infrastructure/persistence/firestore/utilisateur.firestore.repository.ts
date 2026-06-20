import { Injectable, NotFoundException } from '@nestjs/common';
import type { RoleUtilisateur, Utilisateur } from '../../../domain/utilisateur/entities/utilisateur.entity';
import type { UtilisateurRepository } from '../../../domain/utilisateur/repositories/utilisateur.repository.interface';

const NOT_CONFIGURED = 'UtilisateurFirestoreRepository: Firebase non configuré. Définir FIREBASE_PROJECT_ID et FIREBASE_SERVICE_ACCOUNT_JSON.';

// Stub: implémentation à compléter quand firebase-admin est installé et Firebase configuré.
// Substituer à UtilisateurInMemoryRepository dans UsersModule lors du déploiement conjoint
// avec la spec front auth.
@Injectable()
export class UtilisateurFirestoreRepository implements UtilisateurRepository {
  async findAll(): Promise<Utilisateur[]> {
    throw new Error(NOT_CONFIGURED);
  }

  async findById(_id: string): Promise<Utilisateur | null> {
    throw new Error(NOT_CONFIGURED);
  }

  async save(_entity: Utilisateur): Promise<Utilisateur> {
    throw new Error(NOT_CONFIGURED);
  }

  async findByProviderId(_providerId: string): Promise<Utilisateur | null> {
    throw new Error(NOT_CONFIGURED);
  }

  async updateRole(_id: string, _role: RoleUtilisateur): Promise<Utilisateur> {
    throw new NotFoundException(NOT_CONFIGURED);
  }
}
