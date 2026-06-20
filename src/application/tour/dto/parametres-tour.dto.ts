import { ArrayMinSize, IsInt, IsString, Min } from 'class-validator';
import { ParametresTour } from '../../../domain/tour/entities/tour.entity';

export class ParametresTourDto implements ParametresTour {
  @ArrayMinSize(1)
  @IsString({ each: true })
  nomsTerrains: string[];

  @IsInt()
  @Min(1)
  dureeMatchMinutes: number;

  @IsInt()
  @Min(0)
  latenceMinutes: number;

  @IsInt()
  @Min(0)
  delaiDemarrageMinutes: number;
}
