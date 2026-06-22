import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { InscrireEquipeDto } from './inscrire-equipe.dto';

function buildValidPayload(): Record<string, unknown> {
  return {
    nom: 'Logistique',
    capitaineUserId: 'demo-logistique',
    capitainePseudo: 'CapiLogistique',
    capitaineEmail: 'capitaine@orange.com',
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

  it('lève une erreur de validation sur capitaineEmail quand il est absent', async () => {
    const payload = buildValidPayload();
    delete payload.capitaineEmail;
    const dto = plainToInstance(InscrireEquipeDto, payload);

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'capitaineEmail')).toBe(true);
  });

  it('lève une erreur de validation sur capitaineEmail quand il est mal formé', async () => {
    const dto = plainToInstance(InscrireEquipeDto, {
      ...buildValidPayload(),
      capitaineEmail: 'pas-un-email',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'capitaineEmail')).toBe(true);
  });

  it.each(['capitaine@gmail.com', 'capitaine@fauxorange.com', 'capitaine@orange.com.faux-domaine.fr'])(
    'lève une erreur de validation sur capitaineEmail pour un domaine non orange.com (%s)',
    async (capitaineEmail) => {
      const dto = plainToInstance(InscrireEquipeDto, { ...buildValidPayload(), capitaineEmail });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'capitaineEmail')).toBe(true);
    },
  );

  it.each(['capitaine@orange.com', 'capitaine@si.orange.com', 'Capitaine@Orange.COM'])(
    'ne lève aucune erreur de validation sur capitaineEmail pour un domaine orange.com ou un sous-domaine (%s)',
    async (capitaineEmail) => {
      const dto = plainToInstance(InscrireEquipeDto, { ...buildValidPayload(), capitaineEmail });

      const errors = await validate(dto);

      expect(errors.some((error) => error.property === 'capitaineEmail')).toBe(false);
    },
  );
});
