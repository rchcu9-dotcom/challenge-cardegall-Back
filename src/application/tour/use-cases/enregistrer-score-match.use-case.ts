import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MatchRepository } from '../../../domain/match/repositories/match.repository.interface';
import { MATCH_REPOSITORY } from '../../../domain/shared/tokens';
import { TourCourantDto } from '../dto/tour-courant.dto';
import { ObtenirTourCourantUseCase } from './obtenir-tour-courant.use-case';

@Injectable()
export class EnregistrerScoreMatchUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY) private readonly matchRepository: MatchRepository,
    private readonly obtenirTourCourantUseCase: ObtenirTourCourantUseCase,
  ) {}

  async execute(
    matchId: string,
    scoreA: number,
    scoreB: number,
  ): Promise<TourCourantDto> {
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException(`Match ${matchId} introuvable`);
    }
    if (match.estBye) {
      throw new BadRequestException("Un match Becot n'a pas de score à saisir");
    }

    await this.matchRepository.save({
      ...match,
      scoreA,
      scoreB,
      statut: 'termine',
    });

    return this.obtenirTourCourantUseCase.execute();
  }
}
