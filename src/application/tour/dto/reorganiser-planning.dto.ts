import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsString,
  ValidateNested,
} from 'class-validator';

export class TerrainPlanningDto {
  @IsString()
  terrain!: string;

  @IsArray()
  @IsString({ each: true })
  matchIds!: string[];
}

export class ReorganiserPlanningDto {
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TerrainPlanningDto)
  parTerrain!: TerrainPlanningDto[];
}
