# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy manifests first so Docker layer-caches the install step
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --ignore-scripts

# Copy source
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY apps/web/ ./apps/web/

# Build both workspaces.
# VITE_API_URL="" tells the frontend to use relative URLs (/api/...) so it
# works regardless of the host/port the container is served from.
RUN VITE_API_URL="" npm run build:docker


# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Copy only what's needed to run the API
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Production dependencies only (no devDeps, no web build tools)
RUN npm ci --omit=dev --ignore-scripts --workspace apps/api --workspace packages/shared

# Compiled API
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Shared source (the API tsc already compiled it inline, but we need the
# package.json workspace symlink for Node module resolution at runtime)
COPY --from=builder /app/packages/shared/src ./packages/shared/src

# Built frontend — served as static files by the API in production
COPY --from=builder /app/apps/web/dist ./apps/web/dist

# Cloud Run injects PORT; default to 8080 (Cloud Run convention)
ENV PORT=8080

EXPOSE 8080

CMD ["node", "apps/api/dist/index.js"]
