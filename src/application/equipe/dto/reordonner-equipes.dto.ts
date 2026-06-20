import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ReordonnerEquipesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderedIds!: string[];
}
