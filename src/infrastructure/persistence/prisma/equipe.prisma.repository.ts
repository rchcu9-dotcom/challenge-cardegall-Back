import { Injectable } from '@nestjs/common';
import type { Equipe as EquipeRow, StatutEquipe as PrismaStatutEquipe } from '@prisma/client';
import { Equipe } from '../../../domain/equipe/entities/equipe.entity';
import { EquipeRepository } from '../../../domain/equipe/repositories/equipe.repository.interface';
import { PrismaService } from './prisma.service';

@Injectable()
export class EquipePrismaRepository implements EquipeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Equipe[]> {
    const equipes = await this.prisma.equipe.findMany();
    return equipes.map(toDomain);
  }

  async findById(id: string): Promise<Equipe | null> {
    const equipe = await this.prisma.equipe.findUnique({ where: { id } });
    return equipe ? toDomain(equipe) : null;
  }

  async save(entity: Equipe): Promise<Equipe> {
    const data = toPersistence(entity);
    const saved = await this.prisma.equipe.upsert({
      where: { id: entity.id },
      create: data,
      update: data,
    });
    return toDomain(saved);
  }

  async findEnroleesOrdered(): Promise<Equipe[]> {
    const equipes = await this.prisma.equipe.findMany({
      where: { statut: 'enrolee' },
      orderBy: { ordreArrivee: 'asc' },
    });
    return equipes.map(toDomain);
  }

  async reorder(orderedIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.equipe.update({
          where: { id },
          data: { ordreArrivee: index + 1 },
        }),
      ),
    );
  }
}

function toDomain(row: EquipeRow): Equipe {
  return {
    id: row.id,
    nom: row.nom,
    capitaineUserId: row.capitaineUserId,
    capitainePseudo: row.capitainePseudo ?? undefined,
    capitaineEmail: row.capitaineEmail ?? undefined,
    nbJoueursApprox: row.nbJoueursApprox,
    nbFemininesEnvisage: row.nbFemininesEnvisage,
    commentaire: row.commentaire ?? undefined,
    statut: row.statut as Equipe['statut'],
    nbFemininesReel: row.nbFemininesReel ?? undefined,
    ordreArrivee: row.ordreArrivee ?? undefined,
    dateInscription: row.dateInscription,
    dateEnrolement: row.dateEnrolement ?? undefined,
  };
}

function toPersistence(equipe: Equipe): Omit<EquipeRow, 'matchesCommeA' | 'matchesCommeB' | 'matchesFinaleA' | 'matchesFinaleB'> {
  return {
    id: equipe.id,
    nom: equipe.nom,
    capitaineUserId: equipe.capitaineUserId,
    capitainePseudo: equipe.capitainePseudo ?? null,
    capitaineEmail: equipe.capitaineEmail ?? null,
    nbJoueursApprox: equipe.nbJoueursApprox,
    nbFemininesEnvisage: equipe.nbFemininesEnvisage,
    commentaire: equipe.commentaire ?? null,
    statut: equipe.statut as PrismaStatutEquipe,
    nbFemininesReel: equipe.nbFemininesReel ?? null,
    ordreArrivee: equipe.ordreArrivee ?? null,
    dateInscription: equipe.dateInscription,
    dateEnrolement: equipe.dateEnrolement ?? null,
  };
}
