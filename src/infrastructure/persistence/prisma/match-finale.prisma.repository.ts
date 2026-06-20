import { Injectable } from '@nestjs/common';
import type {
  MatchFinale as MatchFinaleRow,
  TypeMatchFinale as PrismaTypeMatchFinale,
  StatutMatchFinale as PrismaStatutMatchFinale,
} from '@prisma/client';
import { MatchFinale } from '../../../domain/finale/entities/match-finale.entity';
import { MatchFinaleRepository } from '../../../domain/finale/repositories/match-finale.repository.interface';
import { PrismaService } from './prisma.service';

@Injectable()
export class MatchFinalePrismaRepository implements MatchFinaleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<MatchFinale[]> {
    const matches = await this.prisma.matchFinale.findMany();
    return matches.map(toDomain);
  }

  async findById(id: string): Promise<MatchFinale | null> {
    const match = await this.prisma.matchFinale.findUnique({ where: { id } });
    return match ? toDomain(match) : null;
  }

  async save(entity: MatchFinale): Promise<MatchFinale> {
    const data = toPersistence(entity);
    const saved = await this.prisma.matchFinale.upsert({
      where: { id: entity.id },
      create: data,
      update: data,
    });
    return toDomain(saved);
  }
}

function toDomain(row: MatchFinaleRow): MatchFinale {
  return {
    id: row.id,
    type: row.type as MatchFinale['type'],
    equipeAId: row.equipeAId,
    equipeBId: row.equipeBId,
    scoreA: row.scoreA,
    scoreB: row.scoreB,
    statut: row.statut as MatchFinale['statut'],
  };
}

function toPersistence(match: MatchFinale): {
  id: string;
  type: PrismaTypeMatchFinale;
  equipeAId: string | null;
  equipeBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  statut: PrismaStatutMatchFinale;
} {
  return {
    id: match.id,
    type: match.type as PrismaTypeMatchFinale,
    equipeAId: match.equipeAId,
    equipeBId: match.equipeBId,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    statut: match.statut as PrismaStatutMatchFinale,
  };
}
