import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class InscrireEquipeDto {
  @IsString()
  @MinLength(1)
  nom!: string;

  @IsString()
  @MinLength(1)
  capitaineUserId!: string;

  @IsString()
  @MinLength(1)
  capitainePseudo!: string;

  @IsInt()
  @Min(0)
  nbJoueursApprox!: number;

  @IsInt()
  @Min(0)
  nbFemininesEnvisage!: number;

  @IsOptional()
  @IsString()
  commentaire?: string;
}
