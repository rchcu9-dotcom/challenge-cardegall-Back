import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Couvre docs/specs/basculer-local-et-prod-sur-la-bdd-always-data-de-test-rchcu1.md :
// vérifie que la configuration (fichiers .env*, schéma Prisma) référence bien la base
// de test rchcu11_cardegall_test et plus l'ancienne base rchcu11_cardegall.
const backRoot = join(__dirname, '../..');

function readBackFile(relativePath: string): string {
  return readFileSync(join(backRoot, relativePath), 'utf-8');
}

// Capture "rchcu11_cardegall" sans le suffixe "_test" qui suit (ancienne base).
const OLD_DB_NAME_REGEX = /rchcu11_cardegall(?!_test)\b/;

describe('back/.env.staging.example — documentation de la bascule DATABASE_URL', () => {
  const content = readBackFile('.env.staging.example');

  it('référence la base de test rchcu11_cardegall_test', () => {
    expect(content).toMatch(/rchcu11_cardegall_test/);
  });

  it('ne référence plus l’ancienne base rchcu11_cardegall (sans _test)', () => {
    expect(content).not.toMatch(OLD_DB_NAME_REGEX);
  });

  it('documente la commande az containerapp update pour DATABASE_URL', () => {
    expect(content).toMatch(/az containerapp update/);
    expect(content).toMatch(
      /--resource-group rg-challenge-cardegall-staging/,
    );
    expect(content).toMatch(/--set-env-vars DATABASE_URL=/);
  });

  it('ne committe aucun secret réel dans le commentaire (placeholder uniquement)', () => {
    expect(content).not.toMatch(/KHHqFk4g29UY_De/);
  });
});

describe('back/.env.example — placeholders génériques uniquement', () => {
  const content = readBackFile('.env.example');

  it('ne référence aucun nom de base réel (rchcu11_cardegall*)', () => {
    expect(content).not.toMatch(/rchcu11_cardegall/);
  });

  it('garde un DATABASE_URL générique avec placeholder <database>', () => {
    expect(content).toMatch(/DATABASE_URL=.*<database>/);
  });
});

describe('back/.env.production.example — hors périmètre de cette spec', () => {
  const content = readBackFile('.env.production.example');

  it('ne définit pas DATABASE_URL (environnement Cloud Run non déployé)', () => {
    expect(content).not.toMatch(/^DATABASE_URL=/m);
  });
});

describe('back/prisma/schema.prisma — indirection via env(), pas de nom de base en dur', () => {
  const content = readBackFile('prisma/schema.prisma');

  it('lit DATABASE_URL via env() sans nom de base codé en dur', () => {
    expect(content).toMatch(/url\s*=\s*env\("DATABASE_URL"\)/);
    expect(content).not.toMatch(/rchcu11_cardegall/);
  });
});

const envLocalPath = join(backRoot, '.env.local');
const describeEnvLocal = existsSync(envLocalPath) ? describe : describe.skip;

describeEnvLocal(
  'back/.env.local — bascule effective (fichier local non versionné, vérifié si présent)',
  () => {
    // Lu dans beforeAll (et non au niveau du describe) : describe.skip n'empêche
    // pas l'exécution du corps du describe lui-même (seulement des hooks/it),
    // donc un readFileSync ici planterait quand même en CI où le fichier n'existe pas.
    let content: string;
    beforeAll(() => {
      content = readFileSync(envLocalPath, 'utf-8');
    });

    it('pointe DATABASE_URL vers rchcu11_cardegall_test', () => {
      expect(content).toMatch(/DATABASE_URL=.*rchcu11_cardegall_test/);
    });

    it('ne pointe plus vers l’ancienne base rchcu11_cardegall (sans _test)', () => {
      const databaseUrlLine = content
        .split('\n')
        .find((line) => line.startsWith('DATABASE_URL='));
      expect(databaseUrlLine).toBeDefined();
      expect(databaseUrlLine).not.toMatch(OLD_DB_NAME_REGEX);
    });
  },
);
