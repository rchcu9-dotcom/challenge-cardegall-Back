import { IsIn } from 'class-validator';
import type { RoleUtilisateur } from '../../../domain/utilisateur/entities/utilisateur.entity';

export class ModifierRoleUtilisateurDto {
  @IsIn(['admin', 'capitaine', 'membre'])
  role!: RoleUtilisateur;
}
