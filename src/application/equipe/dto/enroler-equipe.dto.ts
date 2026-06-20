import { IsInt, Min } from 'class-validator';

export class EnrolerEquipeDto {
  @IsInt()
  @Min(0)
  nbFemininesReel!: number;
}
