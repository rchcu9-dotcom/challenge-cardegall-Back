import { PhaseFinale } from '../entities/phase-finale.entity';

export interface PhaseFinaleRepository {
  obtenir(): Promise<PhaseFinale | null>;
  save(phaseFinale: PhaseFinale): Promise<PhaseFinale>;
}
