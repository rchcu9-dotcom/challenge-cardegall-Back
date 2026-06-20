import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const backRoot = join(__dirname, '../..');
const repoRoot = join(backRoot, '..');
const workflowsDir = join(backRoot, '.github/workflows');

function readWorkflow(name: string): string {
  return readFileSync(join(workflowsDir, name), 'utf-8');
}

describe('back/.github/workflows/ci.yml', () => {
  const workflow = readWorkflow('ci.yml');

  it('triggers on pull_request targeting staging and main', () => {
    expect(workflow).toMatch(
      /on:\s*\n\s*pull_request:\s*\n\s*branches:\s*\[staging, main\]/,
    );
  });

  it('runs pnpm audit --prod --audit-level=high after install and before lint/test/build', () => {
    const installIndex = workflow.indexOf('name: Install dependencies');
    const auditIndex = workflow.indexOf('pnpm audit --prod --audit-level=high');
    const lintIndex = workflow.indexOf('name: Lint');
    const testIndex = workflow.indexOf('name: Test');
    const buildIndex = workflow.indexOf('name: Build');

    [installIndex, auditIndex, lintIndex, testIndex, buildIndex].forEach((index) =>
      expect(index).toBeGreaterThan(-1),
    );

    expect(auditIndex).toBeGreaterThan(installIndex);
    expect(auditIndex).toBeLessThan(lintIndex);
    expect(auditIndex).toBeLessThan(testIndex);
    expect(auditIndex).toBeLessThan(buildIndex);
  });

  it('does not deploy anything', () => {
    expect(workflow).not.toMatch(/gcloud run deploy|containerapp/i);
  });
});

describe('back/.github/workflows/deploy-staging.yml', () => {
  const workflow = readWorkflow('deploy-staging.yml');

  it('triggers on push to staging', () => {
    expect(workflow).toMatch(/on:\s*\n\s*push:\s*\n\s*branches:\s*\[staging\]/);
  });

  it('runs pnpm audit --prod --audit-level=high after install and before lint/test/deploy', () => {
    const installIndex = workflow.indexOf('name: Install dependencies');
    const auditIndex = workflow.indexOf('pnpm audit --prod --audit-level=high');
    const lintIndex = workflow.indexOf('name: Lint');
    const testIndex = workflow.indexOf('name: Test');
    const deployIndex = workflow.indexOf('name: Deploy to Azure Container Apps');

    [installIndex, auditIndex, lintIndex, testIndex, deployIndex].forEach((index) =>
      expect(index).toBeGreaterThan(-1),
    );

    expect(auditIndex).toBeGreaterThan(installIndex);
    expect(auditIndex).toBeLessThan(lintIndex);
    expect(auditIndex).toBeLessThan(testIndex);
    expect(auditIndex).toBeLessThan(deployIndex);
  });

  it('builds and pushes the Docker image to ACR before deploying to Container Apps', () => {
    const buildIndex = workflow.indexOf('name: Build Docker image');
    const pushIndex = workflow.indexOf('name: Push Docker image');
    const deployIndex = workflow.indexOf('name: Deploy to Azure Container Apps');

    expect(buildIndex).toBeGreaterThan(-1);
    expect(pushIndex).toBeGreaterThan(buildIndex);
    expect(deployIndex).toBeGreaterThan(pushIndex);
  });

  it('checks the /health endpoint after deployment', () => {
    expect(workflow).toMatch(/name: Wait for container readiness/);
    expect(workflow).toMatch(/\/health/);
  });
});

describe('back/.github/workflows/deploy-prod.yml', () => {
  const workflow = readWorkflow('deploy-prod.yml');

  it('triggers on push to main', () => {
    expect(workflow).toMatch(/on:\s*\n\s*push:\s*\n\s*branches:\s*\[main\]/);
  });

  it('runs pnpm audit --prod --audit-level=high after install and before lint/test/deploy', () => {
    const installIndex = workflow.indexOf('name: Install dependencies');
    const auditIndex = workflow.indexOf('pnpm audit --prod --audit-level=high');
    const lintIndex = workflow.indexOf('name: Lint');
    const testIndex = workflow.indexOf('name: Test');
    const deployIndex = workflow.indexOf('name: Deploy to Cloud Run');

    [installIndex, auditIndex, lintIndex, testIndex, deployIndex].forEach((index) =>
      expect(index).toBeGreaterThan(-1),
    );

    expect(auditIndex).toBeGreaterThan(installIndex);
    expect(auditIndex).toBeLessThan(lintIndex);
    expect(auditIndex).toBeLessThan(testIndex);
    expect(auditIndex).toBeLessThan(deployIndex);
  });

  it('authenticates to GCP and pushes the image to Artifact Registry before deploying to Cloud Run', () => {
    const authIndex = workflow.indexOf('name: Authenticate to Google Cloud');
    const pushIndex = workflow.indexOf('name: Build & push Docker image');
    const deployIndex = workflow.indexOf('name: Deploy to Cloud Run');

    expect(authIndex).toBeGreaterThan(-1);
    expect(pushIndex).toBeGreaterThan(authIndex);
    expect(deployIndex).toBeGreaterThan(pushIndex);
  });
});

describe('back/Dockerfile', () => {
  const dockerfile = readFileSync(join(backRoot, 'Dockerfile'), 'utf-8');

  it('uses a multi-stage build (builder + runner) on node:20-alpine', () => {
    expect(dockerfile).toMatch(/FROM node:20-alpine AS builder/);
    expect(dockerfile).toMatch(/FROM node:20-alpine AS runner/);
  });

  it('runs a Prisma generate step before building', () => {
    expect(dockerfile).toMatch(/prisma generate/i);
  });

  it('defines a HEALTHCHECK against the /health endpoint', () => {
    expect(dockerfile).toMatch(/HEALTHCHECK/);
    expect(dockerfile).toMatch(/\/health/);
  });

  it('starts the compiled server', () => {
    expect(dockerfile).toMatch(/CMD \["node", "dist\/main\.js"\]/);
  });
});

describe('back/.dockerignore', () => {
  const dockerignore = readFileSync(join(backRoot, '.dockerignore'), 'utf-8');

  it.each(['node_modules', 'dist', 'coverage', '.env'])(
    'excludes %s',
    (entry) => {
      expect(dockerignore.split('\n').map((l) => l.trim())).toContain(entry);
    },
  );
});

describe.each(['.env.staging.example', '.env.production.example'])(
  'back/%s',
  (filename) => {
    const content = readFileSync(join(backRoot, filename), 'utf-8');

    it('defines PORT and a CORS_ORIGINS pointing to an https URL', () => {
      expect(content).toMatch(/^PORT=\d+$/m);
      expect(content).toMatch(/^CORS_ORIGINS=https:\/\//m);
    });
  },
);

describe('ADR — organisation des repos Git et stratégie de déploiement', () => {
  const adrPath = join(
    repoRoot,
    'docs/adr/2026-06-13-organisation-repos-git-et-strategie-deploiement.md',
  );

  it('exists with status "Accepté"', () => {
    expect(existsSync(adrPath)).toBe(true);

    const content = readFileSync(adrPath, 'utf-8');
    expect(content).toMatch(/## Statut\s*\n\s*Accepté/);
  });
});
