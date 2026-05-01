# Workspace

## Overview

pnpm workspace monorepo using TypeScript. CalorApp — a comprehensive mobile calorie tracking PWA for iPhone.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integration (env vars auto-set)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### CalorApp (`artifacts/calorie-tracker`)
- React + Vite PWA, mobile-first (iPhone 15), pastel palette
- Routes: `/` (Hoy), `/alimentos`, `/recetas`, `/calendario`, `/perfil`, `/progreso`, `/estadisticas`, `/escanear`
- Bottom nav with 5 tabs + centered camera FAB

### API Server (`artifacts/api-server`)
- Mounts at `/api`
- Routes: `/api/profile`, `/api/foods`, `/api/recipes`, `/api/logs`, `/api/exercises`, `/api/dashboard`, `/api/ai`
- AI endpoints: POST `/api/ai/analyze-image` (vision), GET `/api/ai/weekly-summary`, GET `/api/ai/monthly-summary`

## Database Schema (lib/db)
- `users_profile` — profile, Harris-Benedict, goals
- `foods` — food database with categories
- `portions` — serving size presets per food
- `recipes` — custom recipes with ingredients JSON
- `log_entries` — daily food log (6 meal slots)
- `exercises` — exercise sessions
- `weight_logs` — daily weight/body measurements

## Shared Libs
- `lib/api-spec` — OpenAPI spec + codegen config
- `lib/api-zod` — generated Zod schemas (auto, do not edit)
- `lib/api-react` — generated React Query hooks (auto, do not edit)
- `lib/db` — Drizzle ORM schema + db client
- `lib/integrations-openai-ai-server` — OpenAI server client
- `lib/integrations-openai-ai-react` — OpenAI React hooks

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
