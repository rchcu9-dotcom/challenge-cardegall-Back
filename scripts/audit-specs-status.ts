/**
 * Script d'audit du statut staging/prod des specs (lecture seule).
 *
 * Lit chaque fichier docs/specs/*.md, parse son frontmatter, croise le statut déclaré
 * avec la dernière date "## QA ·" de son .track.md associé et avec la dernière entrée
 * staging de docs/deploiements.log.jsonl, puis classe les specs status: qa en :
 *   - "candidate-sure-staging"        (dernière QA strictement avant le déploiement staging)
 *   - "ambigue-verification-requise"  (même jour calendaire, ou pas de date QA trouvée)
 *   - "exclue"                        (toute spec dont le statut frontmatter n'est pas "qa")
 *
 * Mode lecture seule uniquement dans cette itération : pas de mode --apply, aucune
 * écriture sur les fichiers docs/specs/*.md. Voir
 * docs/specs/la-plupart-des-features-du-projet-cardegall-sont-en-staging-.track.md
 * (section "Arch · 2026-06-21") pour le détail de l'architecture.
 *
 * Usage : pnpm run audit:specs (depuis back/)
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  AuditReport,
  AuditRow,
  DeploiementLogEntry,
  SpecFrontmatter,
} from './types';

const SPECS_DIR = path.resolve(__dirname, '../../docs/specs');
const DEPLOIEMENTS_LOG_PATH = path.resolve(
  __dirname,
  '../../docs/deploiements.log.jsonl',
);
const AUDIT_REPORTS_DIR = path.resolve(SPECS_DIR, '_audit-reports');

/**
 * Parseur de frontmatter minimal, dédié au format homogène observé dans
 * docs/specs/*.md : un bloc délimité par deux lignes "---", contenant des paires
 * "clé: valeur" sur une seule ligne chacune (pas de YAML multi-ligne, pas
 * d'imbrication). Volontairement pas de dépendance à une lib YAML pour ce besoin
 * simple — cf. consigne de l'itération.
 */
export function parseFrontmatter(fileContent: string): Partial<SpecFrontmatter> {
  const lines = fileContent.split(/\r?\n/);

  if (lines[0]?.trim() !== '---') {
    throw new Error('Frontmatter introuvable : la première ligne doit être "---".');
  }

  const endIndex = lines.indexOf('---', 1);
  if (endIndex === -1) {
    throw new Error('Frontmatter introuvable : délimiteur de fermeture "---" manquant.');
  }

  const frontmatterLines = lines.slice(1, endIndex);
  const result: Record<string, unknown> = {};

  for (const line of frontmatterLines) {
    if (line.trim() === '') continue;

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();

    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      // Liste inline simple : domains: [inscription, admin] ou domains: []
      const inner = rawValue.slice(1, -1).trim();
      result[key] = inner === '' ? [] : inner.split(',').map((v) => v.trim());
    } else {
      result[key] = rawValue;
    }
  }

  return result as Partial<SpecFrontmatter>;
}

/**
 * Extrait la dernière date d'une section "## QA · YYYY-MM-DD" du contenu d'un
 * .track.md. Retourne undefined si aucune section QA n'est trouvée.
 */
export function extractLastQaDate(trackContent: string): string | undefined {
  const matches = [...trackContent.matchAll(/^## QA · (\d{4}-\d{2}-\d{2})/gm)];
  if (matches.length === 0) return undefined;

  const dates = matches.map((m) => m[1]);
  // Tri lexicographique == tri chronologique pour des dates ISO YYYY-MM-DD.
  dates.sort();
  return dates[dates.length - 1];
}

export function readDeploiementsLog(): DeploiementLogEntry[] {
  const raw = fs.readFileSync(DEPLOIEMENTS_LOG_PATH, 'utf-8');
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as DeploiementLogEntry);
}

export function findLastStagingDeploiement(
  entries: DeploiementLogEntry[],
): DeploiementLogEntry {
  const stagingEntries = entries.filter((e) => e.environnement === 'staging');
  if (stagingEntries.length === 0) {
    throw new Error(
      `Aucune entrée "staging" trouvée dans ${DEPLOIEMENTS_LOG_PATH}.`,
    );
  }

  return stagingEntries.reduce((latest, current) =>
    new Date(current.date).getTime() > new Date(latest.date).getTime()
      ? current
      : latest,
  );
}

/** Compare deux dates ISO par leur jour calendaire (UTC), indépendamment de l'heure. */
export function isSameCalendarDay(isoDateA: string, isoDateB: string): boolean {
  return isoDateA.slice(0, 10) === isoDateB.slice(0, 10);
}

export function isBeforeCalendarDay(qaDate: string, deploiementDate: string): boolean {
  return qaDate.slice(0, 10) < deploiementDate.slice(0, 10);
}

export function buildAuditRow(
  specFile: string,
  frontmatter: Partial<SpecFrontmatter>,
  derniereDateQA: string | undefined,
  dernierDeploiementStaging: DeploiementLogEntry,
): AuditRow {
  const statusActuel = frontmatter.status as SpecFrontmatter['status'];
  const dernierDeploiementReference = dernierDeploiementStaging.date;

  if (statusActuel !== 'qa') {
    return {
      specFile,
      statusActuel,
      derniereDateQA,
      classification: 'exclue',
      motifExclusion: `status frontmatter "${statusActuel}" différent de "qa" — hors périmètre de classification (seules les specs "qa" sont candidates à la promotion staging).`,
      dernierDeploiementReference,
    };
  }

  if (!derniereDateQA) {
    return {
      specFile,
      statusActuel,
      derniereDateQA,
      classification: 'ambigue-verification-requise',
      motifExclusion: 'Aucune section "## QA ·" trouvée dans le .track.md associé.',
      dernierDeploiementReference,
    };
  }

  if (isSameCalendarDay(derniereDateQA, dernierDeploiementStaging.date)) {
    return {
      specFile,
      statusActuel,
      derniereDateQA,
      classification: 'ambigue-verification-requise',
      dernierDeploiementReference,
    };
  }

  if (isBeforeCalendarDay(derniereDateQA, dernierDeploiementStaging.date)) {
    return {
      specFile,
      statusActuel,
      derniereDateQA,
      classification: 'candidate-sure-staging',
      dernierDeploiementReference,
    };
  }

  // Dernière QA strictement après le dernier déploiement staging connu : le code
  // QA'é n'a probablement pas encore été inclus dans un instantané staging.
  return {
    specFile,
    statusActuel,
    derniereDateQA,
    classification: 'ambigue-verification-requise',
    motifExclusion:
      'Dernière date QA postérieure au dernier déploiement staging connu — aucun instantané staging ne couvre ce code à ce jour.',
    dernierDeploiementReference,
  };
}

export function listSpecMarkdownFiles(): string[] {
  return fs
    .readdirSync(SPECS_DIR)
    .filter((f) => f.endsWith('.md') && !f.endsWith('.track.md'))
    .sort();
}

export function buildReport(): AuditReport {
  const deploiementsLog = readDeploiementsLog();
  const dernierDeploiementStaging = findLastStagingDeploiement(deploiementsLog);

  const specFiles = listSpecMarkdownFiles();
  const lignes: AuditRow[] = specFiles.map((specFile) => {
    const specPath = path.join(SPECS_DIR, specFile);
    const specContent = fs.readFileSync(specPath, 'utf-8');
    const frontmatter = parseFrontmatter(specContent);

    const trackFile = specFile.replace(/\.md$/, '.track.md');
    const trackPath = path.join(SPECS_DIR, trackFile);

    let derniereDateQA: string | undefined;
    if (fs.existsSync(trackPath)) {
      const trackContent = fs.readFileSync(trackPath, 'utf-8');
      derniereDateQA = extractLastQaDate(trackContent);
    }

    return buildAuditRow(
      specFile,
      frontmatter,
      derniereDateQA,
      dernierDeploiementStaging,
    );
  });

  return {
    genereLe: new Date().toISOString(),
    dernierDeploiementStaging: dernierDeploiementStaging.date,
    lignes,
  };
}

function printReportTable(report: AuditReport): void {
  console.log(`\nAudit du statut staging/prod des specs — généré le ${report.genereLe}`);
  console.log(`Dernier déploiement staging connu : ${report.dernierDeploiementStaging}\n`);

  console.table(
    report.lignes.map((row) => ({
      specFile: row.specFile,
      statusActuel: row.statusActuel,
      derniereDateQA: row.derniereDateQA ?? '—',
      classification: row.classification,
      motifExclusion: row.motifExclusion ?? '',
    })),
  );

  const counts = report.lignes.reduce<Record<string, number>>((acc, row) => {
    acc[row.classification] = (acc[row.classification] ?? 0) + 1;
    return acc;
  }, {});

  console.log('\nRécapitulatif par classification :');
  for (const [classification, count] of Object.entries(counts)) {
    console.log(`  ${classification}: ${count}`);
  }
  console.log(`  TOTAL: ${report.lignes.length}\n`);
}

function writeReportFile(report: AuditReport): string {
  if (!fs.existsSync(AUDIT_REPORTS_DIR)) {
    fs.mkdirSync(AUDIT_REPORTS_DIR, { recursive: true });
  }

  const today = new Date().toISOString().slice(0, 10);
  const outputPath = path.join(AUDIT_REPORTS_DIR, `${today}-audit-staging.json`);

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');

  return outputPath;
}

function main(): void {
  const report = buildReport();
  printReportTable(report);
  const outputPath = writeReportFile(report);
  console.log(`Rapport JSON écrit dans : ${outputPath}`);
}

if (require.main === module) {
  main();
}
