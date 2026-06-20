# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable

# Copy manifests only (better layer caching). .npmrc is required to resolve
# @rchcu9-dotcom/* packages from GitHub Packages (the auth token is injected via a
# BuildKit secret mount below, never baked into an image layer).
COPY package.json pnpm-lock.yaml .npmrc ./
ENV NODE_ENV=development
RUN --mount=type=secret,id=node_auth_token,env=NODE_AUTH_TOKEN \
    pnpm install --frozen-lockfile --prod=false

# Copy the rest of the backend and build
COPY . .
RUN pnpm exec prisma generate
RUN pnpm run build

# ---- Runtime ----
FROM node:20-alpine AS runner
WORKDIR /app

RUN corepack enable

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json .

ENV NODE_OPTIONS="--max-old-space-size=1024"
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3010) + '/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main.js"]
