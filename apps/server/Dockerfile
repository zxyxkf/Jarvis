# Jarvis Server Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app

# pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/

RUN pnpm install --frozen-lockfile --filter @jarvis/server

# Source
COPY packages/shared/ packages/shared/
COPY apps/server/ apps/server/

# Generate Prisma + Build
RUN pnpm --filter @jarvis/server db:generate
RUN pnpm --filter @jarvis/server build

FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/prisma ./prisma
COPY --from=builder /app/apps/server/package.json ./
COPY --from=builder /app/packages/shared ./packages/shared

EXPOSE 3000

# Generate Prisma client at runtime
RUN npx prisma generate --schema=./prisma/schema.prisma

CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/main.js"]
