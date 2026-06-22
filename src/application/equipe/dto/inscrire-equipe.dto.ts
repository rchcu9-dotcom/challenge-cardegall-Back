import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export const ORANGE_COM_EMAIL_REGEX = /^[^\s@]+@([a-z0-9-]+\.)*orange\.com$/i;

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

  @IsEmail()
  @Matches(ORANGE_COM_EMAIL_REGEX, {
    message: "L'adresse mail doit se terminer par orange.com",
  })
  capitaineEmail!: string;

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
