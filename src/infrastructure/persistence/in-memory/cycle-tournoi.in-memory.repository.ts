import { Injectable } from '@nestjs/common';
import { ClassementEntry } from '../../../domain/classement/entities/classement-entry.entity';
import { CycleTournoiRepository } from '../../../domain/tour/repositories/cycle-tournoi.repository.interface';

@Injectable()
export class CycleTournoiInMemoryRepository implements CycleTournoiRepository {
  private phaseFinaleDeclenchee = false;
  private classementFinal: ClassementEntry[] | null = null;

  async estPhaseFinaleDeclenchee(): Promise<boolean> {
    return this.phaseFinaleDeclenchee;
  }

  async declencherPhaseFinale(classementFinal: ClassementEntry[]): Promise<void> {
    this.phaseFinaleDeclenchee = true;
    this.classementFinal = classementFinal;
  }

  async obtenirClassementFinalPoules(): Promise<ClassementEntry[] | null> {
    return this.classementFinal;
  }
}
