import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { UtilisateurFirestoreRepository } from './utilisateur.firestore.repository';
import type { Utilisateur } from '../../../domain/utilisateur/entities/utilisateur.entity';

function buildUtilisateur(overrides: Partial<Utilisateur> = {}): Utilisateur {
  return {
    id: 'test-id',
    providerId: 'test-user-id',
    provider: 'firebase',
    displayName: 'Test User',
    role: 'membre',
    dateApparition: '2026-06-16T00:00:00.000Z',
    ...overrides,
  };
}

const NOT_CONFIGURED = 'Firebase non configuré';

describe('UtilisateurFirestoreRepository (stub)', () => {
  let repository: UtilisateurFirestoreRepository;

  beforeEach(() => {
    repository = new UtilisateurFirestoreRepository();
  });

  it('est défini', () => {
    expect(repository).toBeDefined();
  });

  it('findAll() lève une Error avec le message "Firebase non configuré"', async () => {
    await expect(repository.findAll()).rejects.toThrow(NOT_CONFIGURED);
  });

  it('findById() lève une Error avec le message "Firebase non configuré"', async () => {
    await expect(repository.findById('some-id')).rejects.toThrow(NOT_CONFIGURED);
  });

  it('save() lève une Error avec le message "Firebase non configuré"', async () => {
    await expect(repository.save(buildUtilisateur())).rejects.toThrow(NOT_CONFIGURED);
  });

  it('findByProviderId() lève une Error avec le message "Firebase non configuré"', async () => {
    await expect(repository.findByProviderId('some-uid')).rejects.toThrow(NOT_CONFIGURED);
  });

  it('updateRole() lève une NotFoundException', async () => {
    await expect(repository.updateRole('some-id', 'admin')).rejects.toThrow(NotFoundException);
  });

  it('updateRole() NotFoundException contient le message "Firebase non configuré"', async () => {
    await expect(repository.updateRole('some-id', 'admin')).rejects.toThrow(NOT_CONFIGURED);
  });

  it('findAll() lève une instance de Error (pas NotFoundException)', async () => {
    await expect(repository.findAll()).rejects.toBeInstanceOf(Error);
  });

  it('findById() accepte n\'importe quel id et lève toujours une erreur', async () => {
    await expect(repository.findById('')).rejects.toThrow(NOT_CONFIGURED);
    await expect(repository.findById('uuid-valide')).rejects.toThrow(NOT_CONFIGURED);
  });

  it('save() accepte n\'importe quelle entité et lève toujours une erreur', async () => {
    const admin = buildUtilisateur({ role: 'admin', email: 'a@b.com' });
    await expect(repository.save(admin)).rejects.toThrow(NOT_CONFIGURED);
  });
});
