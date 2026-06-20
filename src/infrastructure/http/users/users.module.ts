import { Module } from '@nestjs/common';
import { ListerUtilisateursUseCase } from '../../../application/utilisateur/use-cases/lister-utilisateurs.use-case';
import { ModifierRoleUtilisateurUseCase } from '../../../application/utilisateur/use-cases/modifier-role-utilisateur.use-case';
import { UTILISATEUR_REPOSITORY } from '../../../domain/shared/tokens';
// In-memory binding conservé en commentaire pour faciliter un retour en arrière en dev/tests :
// import { UtilisateurInMemoryRepository } from '../../persistence/in-memory/utilisateur.in-memory.repository';
import { UtilisateurPrismaRepository } from '../../persistence/prisma/utilisateur.prisma.repository';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [
    ListerUtilisateursUseCase,
    ModifierRoleUtilisateurUseCase,
    { provide: UTILISATEUR_REPOSITORY, useClass: UtilisateurPrismaRepository },
  ],
  exports: [UTILISATEUR_REPOSITORY],
})
export class UsersModule {}
