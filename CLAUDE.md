# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

AI-assisted chess coaching app built with React, TypeScript, Node.js, and an LLM backend. Early-stage scaffold — the API's `/analyze-position` endpoint and the full frontend UI are not yet implemented.

## Architecture

This is an **npm workspaces monorepo** with three packages:

- `apps/web` — React + Vite frontend (TypeScript, port 5173)
- `apps/api` — Express 5 backend (TypeScript via `tsx`, port 3001)
- `packages/shared` — shared TypeScript types consumed by both apps (published as `@ai-chess-copilot/shared`)

The frontend calls the API using `VITE_API_URL` (defaults to `http://localhost:3001`). CORS is configured on the API to allow `CORS_ORIGIN` (defaults to `http://localhost:5173`).

The shared package exports its raw `.ts` source directly (no build step); both apps import it via the workspace symlink.

## Commands

All commands run from the repo root unless noted.

**Dev (both apps concurrently):**
```
npm run dev
```

**Dev individually:**
```
npm run dev:web   # Vite dev server
npm run dev:api   # tsx --watch
```

**Build:**
```
npm run build:web
npm run build:api
```

**Lint & format:**
```
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

**API only (after build):**
```
cd apps/api && npm start
```

## Code style

Prettier config: double quotes, semicolons, trailing commas everywhere (`"trailingComma": "all"`).

ESLint: typescript-eslint recommended + react-hooks + react-refresh (web), typescript-eslint recommended (root/api). `no-console` is off.

The API uses ES modules (`"type": "module"`) with `NodeNext` module resolution — use `.js` extensions when importing local files in `apps/api/src`.

## Environment

`.env` at repo root sets `VITE_API_URL=http://localhost:3001`. The API reads `PORT` and `CORS_ORIGIN` from its environment.
