import { NotFoundException } from '@nestjs/common';
import { UtilisateurInMemoryRepository } from './utilisateur.in-memory.repository';

describe('UtilisateurInMemoryRepository', () => {
  it('est seedée avec 4 utilisateurs, dont au moins un admin et un membre', async () => {
    const repo = new UtilisateurInMemoryRepository();

    const utilisateurs = await repo.findAll();

    expect(utilisateurs).toHaveLength(4);
    expect(utilisateurs.filter((u) => u.role === 'admin')).toHaveLength(1);
    expect(utilisateurs.filter((u) => u.role === 'membre')).toHaveLength(3);
    expect(utilisateurs.map((u) => u.providerId)).toEqual([
      'demo-admin',
      'demo-capitaine',
      'demo-organisateur',
      'demo-joueur',
    ]);
    // Tous les utilisateurs ont un id et une dateApparition ISO 8601.
    utilisateurs.forEach((u) => {
      expect(u.id).toBeTruthy();
      expect(() => new Date(u.dateApparition).toISOString()).not.toThrow();
    });
    // demo-joueur n'a pas d'email (fallback '—' côté front).
    expect(utilisateurs.find((u) => u.providerId === 'demo-joueur')?.email).toBeUndefined();
  });

  it('findAll retourne toutes les entrées seedées', async () => {
    const repo = new UtilisateurInMemoryRepository();

    const utilisateurs = await repo.findAll();

    expect(utilisateurs).toHaveLength(4);
  });

  it('findById retourne un utilisateur seedé par id', async () => {
    const repo = new UtilisateurInMemoryRepository();
    const [premier] = await repo.findAll();

    expect(await repo.findById(premier.id)).toEqual(premier);
  });

  it('findById retourne null pour un identifiant inconnu', async () => {
    const repo = new UtilisateurInMemoryRepository();

    expect(await repo.findById('inconnu')).toBeNull();
  });

  it('findByProviderId retourne un utilisateur seedé par providerId', async () => {
    const repo = new UtilisateurInMemoryRepository();

    const admin = await repo.findByProviderId('demo-admin');

    expect(admin).not.toBeNull();
    expect(admin?.role).toBe('admin');
  });

  it('findByProviderId retourne null pour un providerId inconnu', async () => {
    const repo = new UtilisateurInMemoryRepository();

    expect(await repo.findByProviderId('inconnu')).toBeNull();
  });

  it('updateRole met à jour le rôle et persiste le changement', async () => {
    const repo = new UtilisateurInMemoryRepository();
    const membre = (await repo.findAll()).find((u) => u.role === 'membre');

    const updated = await repo.updateRole(membre!.id, 'admin');

    expect(updated.role).toBe('admin');
    expect(await repo.findById(membre!.id)).toMatchObject({ role: 'admin' });
  });

  it('updateRole lève NotFoundException pour un identifiant inconnu', async () => {
    const repo = new UtilisateurInMemoryRepository();

    await expect(repo.updateRole('inconnu', 'admin')).rejects.toThrow(NotFoundException);
  });
});
