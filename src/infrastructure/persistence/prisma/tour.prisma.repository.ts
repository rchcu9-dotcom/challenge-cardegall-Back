import { Injectable } from '@nestjs/common';
import type { Tour as TourRow, StatutTour as PrismaStatutTour, Prisma } from '@prisma/client';
import { ParametresTour, Tour } from '../../../domain/tour/entities/tour.entity';
import { TourRepository } from '../../../domain/tour/repositories/tour.repository.interface';
import { PrismaService } from './prisma.service';

@Injectable()
export class TourPrismaRepository implements TourRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Tour[]> {
    const tours = await this.prisma.tour.findMany();
    return tours.map(toDomain);
  }

  async findById(id: string): Promise<Tour | null> {
    const tour = await this.prisma.tour.findUnique({ where: { id } });
    return tour ? toDomain(tour) : null;
  }

  async save(entity: Tour): Promise<Tour> {
    const data = toPersistence(entity);
    const saved = await this.prisma.tour.upsert({
      where: { id: entity.id },
      create: data,
      update: data,
    });
    return toDomain(saved);
  }

  async findCurrent(): Promise<Tour | null> {
    const enCours = await this.prisma.tour.findFirst({ where: { statut: 'en_cours' } });
    if (enCours) {
      return toDomain(enCours);
    }
    return this.findLast();
  }

  async findLast(): Promise<Tour | null> {
    const tour = await this.prisma.tour.findFirst({ orderBy: { numero: 'desc' } });
    return tour ? toDomain(tour) : null;
  }
}

function toDomain(row: TourRow): Tour {
  return {
    id: row.id,
    numero: row.numero,
    statut: row.statut as Tour['statut'],
    parametres: row.parametres as unknown as ParametresTour,
    equipesBecot: row.equipesBecot as unknown as string[],
  };
}

function toPersistence(tour: Tour): {
  id: string;
  numero: number;
  statut: PrismaStatutTour;
  parametres: Prisma.InputJsonValue;
  equipesBecot: Prisma.InputJsonValue;
} {
  return {
    id: tour.id,
    numero: tour.numero,
    statut: tour.statut as PrismaStatutTour,
    parametres: tour.parametres as unknown as Prisma.InputJsonValue,
    equipesBecot: tour.equipesBecot as unknown as Prisma.InputJsonValue,
  };
}
