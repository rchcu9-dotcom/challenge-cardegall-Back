import { Injectable } from '@nestjs/common';
import { Equipe } from '../../equipe/entities/equipe.entity';
import { Match } from '../../match/entities/match.entity';
import { ClassementEntry } from '../entities/classement-entry.entity';
import { ClassementService } from './classement.service';

const POINTS_VICTOIRE = 3;
const POINTS_NUL = 1;
const POINTS_DEFAITE = 0;

/**
 * Implémentation de référence de `ClassementService` : points 3/1/0, puis tri
 * selon `ORDRE_CRITERES_DEPARTAGE`. `diffParticuliere` est calculé par équipe à
 * partir des confrontations directes avec les équipes à égalité de points
 * (cf. `saisie-resultats-classement`, décision 4).
 */
@Injectable()
export class ClassementNaiveService implements ClassementService {
  calculer(equipes: Equipe[], matches: Match[]): ClassementEntry[] {
    const entries = new Map<string, ClassementEntry>();

    for (const equipe of equipes) {
      entries.set(equipe.id, {
        equipeId: equipe.id,
        points: 0,
        victoires: 0,
        nuls: 0,
        defaites: 0,
        butsMarques: 0,
        butsConcedes: 0,
        diffGenerale: 0,
        diffParticuliere: 0,
        nbFeminines: equipe.nbFemininesReel ?? equipe.nbFemininesEnvisage,
        rang: 0,
      });
    }

    const matchesComptabilises = matches.filter(
      (match) =>
        match.statut === 'termine' &&
        !match.estBye &&
        match.equipeBId !== null &&
        match.scoreA !== null &&
        match.scoreB !== null,
    );

    for (const match of matchesComptabilises) {
      const scoreA = match.scoreA as number;
      const scoreB = match.scoreB as number;
      const entryA = entries.get(match.equipeAId);
      const entryB = entries.get(match.equipeBId as string);

      if (entryA) {
        entryA.butsMarques += scoreA;
        entryA.butsConcedes += scoreB;
      }
      if (entryB) {
        entryB.butsMarques += scoreB;
        entryB.butsConcedes += scoreA;
      }

      if (scoreA > scoreB) {
        if (entryA) {
          entryA.victoires += 1;
          entryA.points += POINTS_VICTOIRE;
        }
        if (entryB) {
          entryB.defaites += 1;
          entryB.points += POINTS_DEFAITE;
        }
      } else if (scoreA < scoreB) {
        if (entryB) {
          entryB.victoires += 1;
          entryB.points += POINTS_VICTOIRE;
        }
        if (entryA) {
          entryA.defaites += 1;
          entryA.points += POINTS_DEFAITE;
        }
      } else {
        if (entryA) {
          entryA.nuls += 1;
          entryA.points += POINTS_NUL;
        }
        if (entryB) {
          entryB.nuls += 1;
          entryB.points += POINTS_NUL;
        }
      }
    }

    for (const entry of entries.values()) {
      entry.diffGenerale = entry.butsMarques - entry.butsConcedes;
    }

    const groupesParPoints = new Map<number, string[]>();
    for (const entry of entries.values()) {
      const groupe = groupesParPoints.get(entry.points) ?? [];
      groupe.push(entry.equipeId);
      groupesParPoints.set(entry.points, groupe);
    }

    for (const entry of entries.values()) {
      const groupe = new Set(groupesParPoints.get(entry.points));
      let butsMarquesParticulier = 0;
      let butsConcedesParticulier = 0;

      for (const match of matchesComptabilises) {
        const estA = match.equipeAId === entry.equipeId;
        const estB = match.equipeBId === entry.equipeId;
        if (!estA && !estB) {
          continue;
        }

        const adversaireId = estA ? match.equipeBId : match.equipeAId;
        if (!adversaireId || !groupe.has(adversaireId)) {
          continue;
        }

        butsMarquesParticulier += estA ? (match.scoreA as number) : (match.scoreB as number);
        butsConcedesParticulier += estA ? (match.scoreB as number) : (match.scoreA as number);
      }

      entry.diffParticuliere = butsMarquesParticulier - butsConcedesParticulier;
    }

    const classement = [...entries.values()].sort((a, b) => {
      if (a.points !== b.points) {
        return b.points - a.points;
      }
      if (a.diffParticuliere !== b.diffParticuliere) {
        return b.diffParticuliere - a.diffParticuliere;
      }
      if (a.diffGenerale !== b.diffGenerale) {
        return b.diffGenerale - a.diffGenerale;
      }
      if (a.butsMarques !== b.butsMarques) {
        return b.butsMarques - a.butsMarques;
      }
      return b.nbFeminines - a.nbFeminines;
    });

    classement.forEach((entry, index) => {
      entry.rang = index + 1;
    });

    return classement;
  }
}
