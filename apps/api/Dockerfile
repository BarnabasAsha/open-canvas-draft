# Builds and runs apps/api only. The build context is the repo root (see
# railway.json / .dockerignore) rather than this directory, because
# apps/api depends on packages/schema via pnpm's workspace: protocol —
# that only resolves if the whole workspace (pnpm-workspace.yaml + every
# sibling package) is present at install time. Nothing outside apps/api
# is ever built or started, though: the final CMD only ever runs the api.
FROM node:22-slim

RUN corepack enable

WORKDIR /repo
COPY . .

RUN pnpm install --frozen-lockfile

ENV NODE_ENV=production

# Railway injects its own PORT env var at runtime; apps/api already reads
# process.env.PORT (see src/index.ts), so this is just documentation, not
# what actually controls the bound port.
EXPOSE 5005

# Applies any pending drizzle/*.sql migrations, then starts the server —
# && means a failed migration fails the container's startup instead of
# serving traffic against a schema it doesn't match. Safe to run on every
# boot: drizzle-kit migrate only applies migrations not already recorded
# in its own tracking table, so an already-up-to-date DB is a fast no-op.
CMD ["sh", "-c", "pnpm --filter api db:migrate && pnpm --filter api start"]
