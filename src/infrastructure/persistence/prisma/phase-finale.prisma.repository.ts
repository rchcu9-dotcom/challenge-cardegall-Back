import { Injectable } from '@nestjs/common';
import type {
  PhaseFinale as PhaseFinaleRow,
  StatutPhaseFinale as PrismaStatutPhaseFinale,
} from '@prisma/client';
import { PhaseFinale } from '../../../domain/finale/entities/phase-finale.entity';
import { PhaseFinaleRepository } from '../../../domain/finale/repositories/phase-finale.repository.interface';
import { PrismaService } from './prisma.service';

@Injectable()
export class PhaseFinalePrismaRepository implements PhaseFinaleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async obtenir(): Promise<PhaseFinale | null> {
    const phaseFinale = await this.prisma.phaseFinale.findFirst();
    return phaseFinale ? toDomain(phaseFinale) : null;
  }

  async save(phaseFinale: PhaseFinale): Promise<PhaseFinale> {
    const data = toPersistence(phaseFinale);
    const saved = await this.prisma.phaseFinale.upsert({
      where: { id: phaseFinale.id },
      create: data,
      update: data,
    });
    return toDomain(saved);
  }
}

function toDomain(row: PhaseFinaleRow): PhaseFinale {
  return {
    id: row.id,
    demiFinaleAId: row.demiFinaleAId,
    demiFinaleBId: row.demiFinaleBId,
    finaleCardebatId: row.finaleCardebatId,
    finaleLeGallId: row.finaleLeGallId,
    statut: row.statut as PhaseFinale['statut'],
  };
}

function toPersistence(phaseFinale: PhaseFinale): {
  id: string;
  demiFinaleAId: string;
  demiFinaleBId: string;
  finaleCardebatId: string | null;
  finaleLeGallId: string | null;
  statut: PrismaStatutPhaseFinale;
} {
  return {
    id: phaseFinale.id,
    demiFinaleAId: phaseFinale.demiFinaleAId,
    demiFinaleBId: phaseFinale.demiFinaleBId,
    finaleCardebatId: phaseFinale.finaleCardebatId,
    finaleLeGallId: phaseFinale.finaleLeGallId,
    statut: phaseFinale.statut as PrismaStatutPhaseFinale,
  };
}
