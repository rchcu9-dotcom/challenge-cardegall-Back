import { Injectable } from '@nestjs/common';
import { PhaseFinale } from '../../../domain/finale/entities/phase-finale.entity';
import { PhaseFinaleRepository } from '../../../domain/finale/repositories/phase-finale.repository.interface';

@Injectable()
export class PhaseFinaleInMemoryRepository implements PhaseFinaleRepository {
  private phaseFinale: PhaseFinale | null = null;

  async obtenir(): Promise<PhaseFinale | null> {
    return this.phaseFinale;
  }

  async save(phaseFinale: PhaseFinale): Promise<PhaseFinale> {
    this.phaseFinale = phaseFinale;
    return phaseFinale;
  }
}
