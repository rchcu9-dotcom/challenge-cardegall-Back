import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ClassementEntry } from '../../classement/entities/classement-entry.entity';
import { MatchFinale } from '../entities/match-finale.entity';

@Injectable()
export class PhaseFinaleService {
  /** classementFinal trié par rang ; lève une erreur si moins de 4 équipes (validée par le use case en BadRequestException). */
  creerDemiFinales(classementFinal: ClassementEntry[]): {
    demiFinaleA: MatchFinale;
    demiFinaleB: MatchFinale;
  } {
    const classementTrie = [...classementFinal].sort((a, b) => a.rang - b.rang);
    if (classementTrie.length < 4) {
      throw new Error(
        'Classement final insuffisant pour démarrer la phase finale',
      );
    }

    const [premier, deuxieme, troisieme, quatrieme] = classementTrie;

    const demiFinaleA: MatchFinale = {
      id: randomUUID(),
      type: 'demi_finale_a',
      equipeAId: premier.equipeId,
      equipeBId: quatrieme.equipeId,
      scoreA: null,
      scoreB: null,
      statut: 'a_jouer',
    };

    const demiFinaleB: MatchFinale = {
      id: randomUUID(),
      type: 'demi_finale_b',
      equipeAId: deuxieme.equipeId,
      equipeBId: troisieme.equipeId,
      scoreA: null,
      scoreB: null,
      statut: 'a_jouer',
    };

    return { demiFinaleA, demiFinaleB };
  }

  /** scoreA !== scoreB requis (validé par le use case avant appel). */
  determinerVainqueurEtVaincu(match: MatchFinale): {
    vainqueurId: string;
    vaincuId: string;
  } {
    const { equipeAId, equipeBId, scoreA, scoreB } = match;
    if (
      equipeAId === null ||
      equipeBId === null ||
      scoreA === null ||
      scoreB === null
    ) {
      throw new Error(`Match de phase finale ${match.id} incomplet`);
    }

    return scoreA > scoreB
      ? { vainqueurId: equipeAId, vaincuId: equipeBId }
      : { vainqueurId: equipeBId, vaincuId: equipeAId };
  }

  creerFinales(
    demiFinaleA: MatchFinale,
    demiFinaleB: MatchFinale,
  ): { finaleCardebat: MatchFinale; finaleLeGall: MatchFinale } {
    const resultatA = this.determinerVainqueurEtVaincu(demiFinaleA);
    const resultatB = this.determinerVainqueurEtVaincu(demiFinaleB);

    const finaleCardebat: MatchFinale = {
      id: randomUUID(),
      type: 'finale_cardebat',
      equipeAId: resultatA.vainqueurId,
      equipeBId: resultatB.vainqueurId,
      scoreA: null,
      scoreB: null,
      statut: 'a_jouer',
    };

    const finaleLeGall: MatchFinale = {
      id: randomUUID(),
      type: 'finale_le_gall',
      equipeAId: resultatA.vaincuId,
      equipeBId: resultatB.vaincuId,
      scoreA: null,
      scoreB: null,
      statut: 'a_jouer',
    };

    return { finaleCardebat, finaleLeGall };
  }
}
