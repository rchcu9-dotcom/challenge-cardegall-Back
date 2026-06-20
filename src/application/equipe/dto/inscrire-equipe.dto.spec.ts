import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { InscrireEquipeDto } from './inscrire-equipe.dto';

function buildValidPayload(): Record<string, unknown> {
  return {
    nom: 'Logistique',
    capitaineUserId: 'demo-logistique',
    capitainePseudo: 'CapiLogistique',
    nbJoueursApprox: 9,
    nbFemininesEnvisage: 3,
  };
}

describe('InscrireEquipeDto', () => {
  it('ne lève aucune erreur de validation pour un payload valide', async () => {
    const dto = plainToInstance(InscrireEquipeDto, buildValidPayload());

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('lève une erreur de validation sur capitainePseudo quand il est absent', async () => {
    const payload = buildValidPayload();
    delete payload.capitainePseudo;
    const dto = plainToInstance(InscrireEquipeDto, payload);

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'capitainePseudo')).toBe(true);
  });

  it('lève une erreur de validation sur capitainePseudo quand il est vide', async () => {
    const dto = plainToInstance(InscrireEquipeDto, { ...buildValidPayload(), capitainePseudo: '' });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'capitainePseudo')).toBe(true);
  });
});
