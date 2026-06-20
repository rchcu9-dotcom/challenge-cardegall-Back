import { ClassementEntry } from '../../classement/entities/classement-entry.entity';

export interface CycleTournoiRepository {
  estPhaseFinaleDeclenchee(): Promise<boolean>;
  declencherPhaseFinale(classementFinal: ClassementEntry[]): Promise<void>;
  /** Classement de poules figé au moment du déclenchement, ou null si pas encore déclenché. */
  obtenirClassementFinalPoules(): Promise<ClassementEntry[] | null>;
}
