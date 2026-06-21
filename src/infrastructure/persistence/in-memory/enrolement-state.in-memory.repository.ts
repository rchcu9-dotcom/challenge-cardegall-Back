import { Injectable } from '@nestjs/common';
import { EnrolementStateRepository } from '../../../domain/equipe/repositories/enrolement-state.repository.interface';

@Injectable()
export class EnrolementStateInMemoryRepository implements EnrolementStateRepository {
  private cloture = false;

  async isCloture(): Promise<boolean> {
    return this.cloture;
  }

  async cloturer(): Promise<void> {
    this.cloture = true;
  }

  async decloturer(): Promise<void> {
    this.cloture = false;
  }
}
