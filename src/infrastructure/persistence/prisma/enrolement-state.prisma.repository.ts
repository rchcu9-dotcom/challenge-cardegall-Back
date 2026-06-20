import { Injectable } from '@nestjs/common';
import { EnrolementStateRepository } from '../../../domain/equipe/repositories/enrolement-state.repository.interface';
import { PrismaService } from './prisma.service';

const TOURNOI_ETAT_ID = 1;

/**
 * Partage la table singleton `tournoi_etat` (id = 1) avec `CycleTournoiPrismaRepository`.
 * Chaque repository Prisma implémente sa propre interface domain et n'écrit que les
 * champs qui la concernent (cf. spec persistance, section "Points d'attention").
 */
@Injectable()
export class EnrolementStatePrismaRepository implements EnrolementStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async isCloture(): Promise<boolean> {
    const etat = await this.prisma.tournoiEtat.findUnique({ where: { id: TOURNOI_ETAT_ID } });
    return etat?.enrolementsClotures ?? false;
  }

  async cloturer(): Promise<void> {
    await this.prisma.tournoiEtat.upsert({
      where: { id: TOURNOI_ETAT_ID },
      create: { id: TOURNOI_ETAT_ID, enrolementsClotures: true },
      update: { enrolementsClotures: true },
    });
  }
}
