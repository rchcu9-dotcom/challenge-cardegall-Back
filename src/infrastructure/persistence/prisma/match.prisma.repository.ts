import { Injectable } from '@nestjs/common';
import type { Match as MatchRow, StatutMatch as PrismaStatutMatch } from '@prisma/client';
import { Match } from '../../../domain/match/entities/match.entity';
import { MatchRepository } from '../../../domain/match/repositories/match.repository.interface';
import { PrismaService } from './prisma.service';

@Injectable()
export class MatchPrismaRepository implements MatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Match[]> {
    const matches = await this.prisma.match.findMany();
    return matches.map(toDomain);
  }

  async findById(id: string): Promise<Match | null> {
    const match = await this.prisma.match.findUnique({ where: { id } });
    return match ? toDomain(match) : null;
  }

  async save(entity: Match): Promise<Match> {
    const data = toPersistence(entity);
    const saved = await this.prisma.match.upsert({
      where: { id: entity.id },
      create: data,
      update: data,
    });
    return toDomain(saved);
  }

  async findByTour(tourId: string): Promise<Match[]> {
    const matches = await this.prisma.match.findMany({ where: { tourId } });
    return matches.map(toDomain);
  }

  async saveMany(matches: Match[]): Promise<Match[]> {
    await this.prisma.$transaction(
      matches.map((match) => {
        const data = toPersistence(match);
        return this.prisma.match.upsert({
          where: { id: match.id },
          create: data,
          update: data,
        });
      }),
    );
    return matches;
  }
}

function toDomain(row: MatchRow): Match {
  return {
    id: row.id,
    tourId: row.tourId,
    equipeAId: row.equipeAId,
    equipeBId: row.equipeBId,
    estBye: row.estBye,
    terrain: row.terrain,
    heureDebutPrevue: row.heureDebutPrevue,
    heureFinPrevue: row.heureFinPrevue,
    scoreA: row.scoreA,
    scoreB: row.scoreB,
    statut: row.statut as Match['statut'],
  };
}

function toPersistence(match: Match): {
  id: string;
  tourId: string;
  equipeAId: string;
  equipeBId: string | null;
  estBye: boolean;
  terrain: string | null;
  heureDebutPrevue: string | null;
  heureFinPrevue: string | null;
  scoreA: number | null;
  scoreB: number | null;
  statut: PrismaStatutMatch;
} {
  return {
    id: match.id,
    tourId: match.tourId,
    equipeAId: match.equipeAId,
    equipeBId: match.equipeBId,
    estBye: match.estBye,
    terrain: match.terrain,
    heureDebutPrevue: match.heureDebutPrevue,
    heureFinPrevue: match.heureFinPrevue,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    statut: match.statut as PrismaStatutMatch,
  };
}
