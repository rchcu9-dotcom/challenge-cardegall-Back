import {
  parseFrontmatter,
  extractLastQaDate,
  isSameCalendarDay,
  isBeforeCalendarDay,
  buildAuditRow,
  buildReport,
} from '../../scripts/audit-specs-status';
import type { DeploiementLogEntry, SpecFrontmatter } from '../../scripts/types';

// Couvre docs/specs/la-plupart-des-features-du-projet-cardegall-sont-en-staging-.md :
// audit du statut staging/prod des specs (back/scripts/audit-specs-status.ts).

describe('parseFrontmatter', () => {
  it('parse un frontmatter valide avec champs scalaires et un tableau non vide', () => {
    const content = [
      '---',
      'title: Exemple de feature',
      'status: qa',
      'complexity: medium',
      'domains: [inscription, admin]',
      'source: intention',
      '---',
      '',
      '# Exemple de feature',
    ].join('\n');

    const result = parseFrontmatter(content);

    expect(result).toEqual({
      title: 'Exemple de feature',
      status: 'qa',
      complexity: 'medium',
      domains: ['inscription', 'admin'],
      source: 'intention',
    });
  });

  it('parse un tableau vide domains: []', () => {
    const content = ['---', 'title: Sans domaines', 'domains: []', '---', ''].join(
      '\n',
    );

    const result = parseFrontmatter(content);

    expect(result.domains).toEqual([]);
  });

  it('lève une erreur si le délimiteur "---" d\'ouverture est manquant', () => {
    const content = ['title: Pas de délimiteur ouvrant', 'status: qa', '---', ''].join(
      '\n',
    );

    expect(() => parseFrontmatter(content)).toThrow(
      /Frontmatter introuvable.*première ligne/,
    );
  });

  it('lève une erreur si le délimiteur "---" de fermeture est manquant', () => {
    const content = ['---', 'title: Pas de fermeture', 'status: qa', ''].join('\n');

    expect(() => parseFrontmatter(content)).toThrow(
      /Frontmatter introuvable.*fermeture/,
    );
  });
});

describe('extractLastQaDate', () => {
  it('retourne undefined si aucune section "## QA ·" n\'est présente', () => {
    const content = ['# Tracking', '', '## Spec · 2026-06-10', '', 'Contenu.'].join(
      '\n',
    );

    expect(extractLastQaDate(content)).toBeUndefined();
  });

  it('retourne la date unique quand une seule section "## QA ·" existe', () => {
    const content = ['# Tracking', '', '## QA · 2026-06-15', '', 'Contenu.'].join(
      '\n',
    );

    expect(extractLastQaDate(content)).toBe('2026-06-15');
  });

  it('retourne la dernière date par tri chronologique, pas par ordre d\'apparition dans le texte', () => {
    // Les sections apparaissent dans le texte dans le désordre chronologique :
    // 06-20 (1ère occurrence textuelle) puis 06-12 (2e) puis 06-18 (3e, dernière dans le texte).
    // La date chronologiquement la plus récente (06-20) doit être retournée, pas 06-18.
    const content = [
      '# Tracking',
      '',
      '## QA · 2026-06-20',
      'Première section dans le texte, mais pas la plus ancienne.',
      '',
      '## QA · 2026-06-12',
      'Section la plus ancienne.',
      '',
      '## QA · 2026-06-18',
      'Dernière section dans le texte, mais pas la plus récente chronologiquement.',
    ].join('\n');

    expect(extractLastQaDate(content)).toBe('2026-06-20');
  });
});

describe('isSameCalendarDay', () => {
  it('retourne true pour deux horodatages du même jour calendaire à des heures différentes', () => {
    expect(
      isSameCalendarDay('2026-06-20T08:00:00.000Z', '2026-06-20T23:59:59.000Z'),
    ).toBe(true);
  });

  it('retourne false pour un jour avant', () => {
    expect(
      isSameCalendarDay('2026-06-19T23:59:59.000Z', '2026-06-20T00:00:01.000Z'),
    ).toBe(false);
  });

  it('retourne false pour un jour après', () => {
    expect(
      isSameCalendarDay('2026-06-21T00:00:01.000Z', '2026-06-20T23:59:59.000Z'),
    ).toBe(false);
  });
});

describe('isBeforeCalendarDay', () => {
  it('retourne false pour le même jour calendaire (heures différentes)', () => {
    expect(
      isBeforeCalendarDay('2026-06-20T08:00:00.000Z', '2026-06-20T20:00:00.000Z'),
    ).toBe(false);
  });

  it('retourne true quand qaDate est un jour calendaire strictement avant', () => {
    expect(
      isBeforeCalendarDay('2026-06-19T23:59:59.000Z', '2026-06-20T00:00:01.000Z'),
    ).toBe(true);
  });

  it('retourne false quand qaDate est un jour calendaire après', () => {
    expect(
      isBeforeCalendarDay('2026-06-21T00:00:01.000Z', '2026-06-20T23:59:59.000Z'),
    ).toBe(false);
  });
});

describe('buildAuditRow', () => {
  const dernierDeploiementStaging: DeploiementLogEntry = {
    date: '2026-06-20T10:00:00.000Z',
    environnement: 'staging',
    composants: ['back', 'front'],
    methode: 'manuel-az-cli',
  };

  const frontmatterQa: Partial<SpecFrontmatter> = { status: 'qa' };

  it('classe "exclue" quand le status frontmatter n\'est pas "qa"', () => {
    const row = buildAuditRow(
      'exemple-dev.md',
      { status: 'dev' },
      '2026-06-10',
      dernierDeploiementStaging,
    );

    expect(row.classification).toBe('exclue');
    expect(row.statusActuel).toBe('dev');
    expect(row.motifExclusion).toMatch(/différent de "qa"/);
    expect(row.dernierDeploiementReference).toBe(dernierDeploiementStaging.date);
  });

  it('classe "ambigue-verification-requise" quand aucune date QA n\'est trouvée', () => {
    const row = buildAuditRow(
      'exemple-sans-qa.md',
      frontmatterQa,
      undefined,
      dernierDeploiementStaging,
    );

    expect(row.classification).toBe('ambigue-verification-requise');
    expect(row.derniereDateQA).toBeUndefined();
    expect(row.motifExclusion).toMatch(/Aucune section/);
  });

  it('classe "ambigue-verification-requise" quand la QA est le même jour calendaire que le déploiement', () => {
    const row = buildAuditRow(
      'exemple-meme-jour.md',
      frontmatterQa,
      '2026-06-20',
      dernierDeploiementStaging,
    );

    expect(row.classification).toBe('ambigue-verification-requise');
    expect(row.derniereDateQA).toBe('2026-06-20');
  });

  it('classe "candidate-sure-staging" quand la QA est strictement avant le déploiement', () => {
    const row = buildAuditRow(
      'exemple-avant.md',
      frontmatterQa,
      '2026-06-15',
      dernierDeploiementStaging,
    );

    expect(row.classification).toBe('candidate-sure-staging');
    expect(row.motifExclusion).toBeUndefined();
  });

  it('classe "ambigue-verification-requise" quand la QA est strictement après le déploiement', () => {
    const row = buildAuditRow(
      'exemple-apres.md',
      frontmatterQa,
      '2026-06-21',
      dernierDeploiementStaging,
    );

    expect(row.classification).toBe('ambigue-verification-requise');
    expect(row.motifExclusion).toMatch(/postérieure au dernier déploiement/);
  });
});

describe('buildReport (intégration sur le vrai dépôt)', () => {
  const validClassifications = [
    'candidate-sure-staging',
    'ambigue-verification-requise',
    'exclue',
  ];

  it('produit des lignes structurellement valides, cohérentes avec docs/specs/*.md', () => {
    const report = buildReport();

    expect(report.lignes.length).toBeGreaterThan(0);

    for (const row of report.lignes) {
      expect(row.specFile.endsWith('.md')).toBe(true);
      expect(row.specFile.endsWith('.track.md')).toBe(false);
      expect(validClassifications).toContain(row.classification);
    }

    const fs = require('node:fs');
    const path = require('node:path');
    const specsDir = path.resolve(__dirname, '../../../docs/specs');
    const totalSpecFiles = fs
      .readdirSync(specsDir)
      .filter((f: string) => f.endsWith('.md') && !f.endsWith('.track.md')).length;

    expect(report.lignes.length).toBe(totalSpecFiles);

    const counts = report.lignes.reduce<Record<string, number>>((acc, row) => {
      acc[row.classification] = (acc[row.classification] ?? 0) + 1;
      return acc;
    }, {});
    const sumCounts = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(sumCounts).toBe(totalSpecFiles);
  });

  it('n\'a aucune ligne "exclue" avec statusActuel === "qa"', () => {
    const report = buildReport();

    const excludedButQa = report.lignes.filter(
      (row) => row.classification === 'exclue' && row.statusActuel === 'qa',
    );

    expect(excludedButQa).toEqual([]);
  });

  it('n\'a aucune ligne "candidate-sure-staging" ni "ambigue-verification-requise" avec statusActuel !== "qa"', () => {
    const report = buildReport();

    const misclassified = report.lignes.filter(
      (row) =>
        (row.classification === 'candidate-sure-staging' ||
          row.classification === 'ambigue-verification-requise') &&
        row.statusActuel !== 'qa',
    );

    expect(misclassified).toEqual([]);
  });
});
