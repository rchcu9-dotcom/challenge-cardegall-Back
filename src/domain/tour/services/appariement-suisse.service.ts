import { Injectable } from '@nestjs/common';
import { ClassementEntry } from '../../classement/entities/classement-entry.entity';
import { Match } from '../../match/entities/match.entity';
import { AppariementResult, AppariementService } from './appariement.service';

/**
 * Implémentation "ronde suisse" de `AppariementService` : appariement par rang du
 * classement (1v2, 3v4, ...), avec rotation du bye/Becot et évitement (best-effort)
 * des rematchs déjà joués dans le tournoi.
 *
 * Remplace `AppariementNaiveService` (cf. `moteur-appariement-suisse.track.md`,
 * décision 2 de cadrage : même interface, même token `APPARIEMENT_SERVICE`).
 *
 * Les deux règles ci-dessous sont des **décisions par défaut documentées dans
 * `docs/specs/moteur-appariement-suisse.track.md` (section "Dev · 2026-06-13"),
 * à valider par Lionel** (un ADR pourra formaliser/ajuster ces règles ultérieurement).
 */
@Injectable()
export class AppariementSuisseService implements AppariementService {
  genererAppariements(
    classement: ClassementEntry[],
    equipesBecot: string[],
    historiqueMatchs: Match[] = [],
  ): AppariementResult {
    const classementOrdonne = [...classement].sort((a, b) => a.rang - b.rang);

    const { becotEquipeId, participants } = this.selectionnerBecot(classementOrdonne, equipesBecot);
    const historiqueConfrontations = this.construireHistoriqueConfrontations(historiqueMatchs);
    const paireBase = this.appliquerAppariementBase(participants);
    const paires = this.resoudreConflitsRematch(paireBase, historiqueConfrontations);

    return { paires, becotEquipeId };
  }

  /**
   * Sélectionne l'équipe Becot ("bye") du tour pour un nombre impair d'équipes.
   *
   * Règle de rotation (décision par défaut, à valider) :
   * - tant que `equipesBecot` ne contient pas TOUS les ids des équipes du
   *   classement, la nouvelle équipe Becot est la dernière équipe du classement
   *   (rang le plus bas) dont l'id n'est pas déjà dans `equipesBecot` ;
   * - une fois que TOUTES les équipes ont déjà été Becot, on réinitialise le
   *   cycle : on repart comme si `equipesBecot` était vide, et la nouvelle
   *   équipe Becot est de nouveau la dernière équipe du classement.
   *
   * Retourne `becotEquipeId: null` et `participants = classementOrdonne` si le
   * nombre d'équipes est pair.
   */
  private selectionnerBecot(
    classementOrdonne: ClassementEntry[],
    equipesBecot: string[],
  ): { becotEquipeId: string | null; participants: ClassementEntry[] } {
    if (classementOrdonne.length % 2 === 0) {
      return { becotEquipeId: null, participants: classementOrdonne };
    }

    const idsClassement = classementOrdonne.map((entry) => entry.equipeId);
    const cycleComplet = idsClassement.every((id) => equipesBecot.includes(id));
    const historiquePertinent = cycleComplet ? [] : equipesBecot;

    const candidat = [...classementOrdonne]
      .reverse()
      .find((entry) => !historiquePertinent.includes(entry.equipeId));

    const becot = candidat ?? classementOrdonne[classementOrdonne.length - 1];
    const participants = classementOrdonne.filter((entry) => entry.equipeId !== becot.equipeId);

    return { becotEquipeId: becot.equipeId, participants };
  }

  /**
   * Construit l'ensemble des paires d'équipes déjà confrontées (tout l'historique
   * du tournoi), à partir des matchs `estBye: false`. Clé normalisée
   * `"equipeA|equipeB"` indépendante de l'ordre des deux équipes.
   */
  private construireHistoriqueConfrontations(historiqueMatchs: Match[]): Set<string> {
    const historique = new Set<string>();

    for (const match of historiqueMatchs) {
      if (match.estBye || !match.equipeBId) {
        continue;
      }
      historique.add(this.cleConfrontation(match.equipeAId, match.equipeBId));
    }

    return historique;
  }

  /** Appariement strict 1v2, 3v4, ... sur la liste de participants ordonnée par rang. */
  private appliquerAppariementBase(participants: ClassementEntry[]): Array<[string, string]> {
    const paires: Array<[string, string]> = [];
    for (let i = 0; i < participants.length; i += 2) {
      paires.push([participants[i].equipeId, participants[i + 1].equipeId]);
    }
    return paires;
  }

  /**
   * Tente d'éviter les rematchs (confrontations déjà jouées dans l'historique).
   *
   * Règle (décision par défaut, à valider) : pour chaque paire en conflit (déjà
   * jouée), on tente UN échange avec la paire de rang immédiatement inférieur
   * (équipe de rang n+2 <-> équipe de rang n, c'est-à-dire le premier membre de
   * la paire suivante). L'échange n'est appliqué que s'il ne crée pas lui-même un
   * rematch sur les deux paires concernées. Sinon, le rematch initial est accepté
   * (pas de backtracking, pas de recherche exhaustive).
   */
  private resoudreConflitsRematch(
    paires: Array<[string, string]>,
    historiqueConfrontations: Set<string>,
  ): Array<[string, string]> {
    const resultat = paires.map((paire) => [...paire] as [string, string]);

    for (let i = 0; i < resultat.length; i++) {
      const [equipeA, equipeB] = resultat[i];

      if (!historiqueConfrontations.has(this.cleConfrontation(equipeA, equipeB))) {
        continue;
      }

      const paireSuivante = resultat[i + 1];
      if (!paireSuivante) {
        continue;
      }

      const [equipeC, equipeD] = paireSuivante;

      // Échange : equipeB (rang n+1) <-> equipeC (rang n+2)
      const nouvellePaireCourante: [string, string] = [equipeA, equipeC];
      const nouvellePaireSuivante: [string, string] = [equipeB, equipeD];

      const conflitCourant = historiqueConfrontations.has(
        this.cleConfrontation(nouvellePaireCourante[0], nouvellePaireCourante[1]),
      );
      const conflitSuivant = historiqueConfrontations.has(
        this.cleConfrontation(nouvellePaireSuivante[0], nouvellePaireSuivante[1]),
      );

      if (!conflitCourant && !conflitSuivant) {
        resultat[i] = nouvellePaireCourante;
        resultat[i + 1] = nouvellePaireSuivante;
      }
      // Sinon : échange non applicable, on accepte le rematch initial.
    }

    return resultat;
  }

  private cleConfrontation(equipeAId: string, equipeBId: string): string {
    return [equipeAId, equipeBId].sort().join('|');
  }
}
