# Challenge CardeGall — Backend

API NestJS du Challenge CardeGall — tournoi sportif inter-services Orange Business.

## Prérequis

- Node.js 20+
- pnpm

## Installation

```bash
pnpm install
```

## Commandes

```bash
pnpm run start:dev      # NestJS watch mode → http://localhost:3010
pnpm run build          # Compile TypeScript → dist/
pnpm run start:prod      # Run compiled output
pnpm run test            # Jest unit tests
pnpm run test:e2e        # Jest E2E tests
pnpm run lint            # ESLint + autofix
pnpm run format          # Prettier
```

## Variables d'environnement

Voir `.env.example` (local), `.env.staging.example` et `.env.production.example`.

```
PORT=3010
CORS_ORIGINS=http://localhost:5183
```

## Endpoint de santé

`GET /health` — utilisé par les pipelines de déploiement pour vérifier la
disponibilité du service.

## CI/CD

- `.github/workflows/ci.yml` : lint + test + build sur chaque Pull Request vers
  `staging` ou `main`.
- `.github/workflows/deploy-staging.yml` : déploiement automatique sur Azure
  Container Apps à chaque push sur `staging`.
- `.github/workflows/deploy-prod.yml` : déploiement automatique sur GCP Cloud Run à
  chaque push sur `main`.

## Environnements

| Environnement | URL |
|---|---|
| Local | http://localhost:3010/health |
| Staging | _à compléter une fois le déploiement effectué_ |
| Prod | _à compléter une fois le déploiement effectué_ |

## Branches

- `feature/*`, `fix/*`, `chore/*` : branches de travail, jamais de commit direct sur
  `staging` ou `main`.
- `staging` : déployé automatiquement en environnement de staging.
- `main` : déployé automatiquement en production.
