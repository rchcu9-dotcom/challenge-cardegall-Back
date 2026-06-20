import { Injectable } from '@nestjs/common';
import { ClassementEntry } from '../../../domain/classement/entities/classement-entry.entity';
import { CycleTournoiRepository } from '../../../domain/tour/repositories/cycle-tournoi.repository.interface';
import { PrismaService } from './prisma.service';

const TOURNOI_ETAT_ID = 1;

/**
 * Partage la table singleton `tournoi_etat` (id = 1) avec `EnrolementStatePrismaRepository`.
 */
@Injectable()
export class CycleTournoiPrismaRepository implements CycleTournoiRepository {
  constructor(private readonly prisma: PrismaService) {}

  async estPhaseFinaleDeclenchee(): Promise<boolean> {
    const etat = await this.prisma.tournoiEtat.findUnique({ where: { id: TOURNOI_ETAT_ID } });
    return etat?.phaseFinaleDeclenchee ?? false;
  }

  async declencherPhaseFinale(classementFinal: ClassementEntry[]): Promise<void> {
    const classementFinalPoules = classementFinal as unknown as object;
    await this.prisma.tournoiEtat.upsert({
      where: { id: TOURNOI_ETAT_ID },
      create: {
        id: TOURNOI_ETAT_ID,
        phaseFinaleDeclenchee: true,
        classementFinalPoules,
      },
      update: {
        phaseFinaleDeclenchee: true,
        classementFinalPoules,
      },
    });
  }

  async obtenirClassementFinalPoules(): Promise<ClassementEntry[] | null> {
    const etat = await this.prisma.tournoiEtat.findUnique({ where: { id: TOURNOI_ETAT_ID } });
    if (!etat?.classementFinalPoules) {
      return null;
    }
    return etat.classementFinalPoules as unknown as ClassementEntry[];
  }
}
