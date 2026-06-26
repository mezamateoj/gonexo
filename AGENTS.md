# AGENTS.md

## Working Style

- **Phase by phase.** Never start a new phase until the previous one is reviewed and signed off by the user.
- **Backend before frontend.** Within each phase, implement and verify the backend (schema, routes, types) first. The user reviews and tests before any frontend work begins.
- **Frontend with user direction.** Once the backend is approved, frontend is built collaboratively — the user steers UX details. Do not race ahead.
- **No bundling.** One phase = one coherent backend change set + one frontend change set, reviewed independently. Do not sneak in unrelated changes.
- **Ask before expanding scope.** If something adjacent looks broken or incomplete, flag it — don't fix it silently.

---

## Package Manager

- Use pnpm only. Never use npm or yarn.
- For shadcn CLI work, use `pnpm dlx shadcn@latest ...`, not `npx`.

## Default Coding Style

- Extra defensive checks or try/catch blocks that are abnormal for that area of the codebase (especially if called by trusted / validated codepaths) are not permitted
- Casts to any to get around type issues
- Reuse existing helpers, types, components, and route patterns before adding new ones.
- Do not create test files unless explicitly requested.
- Avoid speculative abstractions, factories, scaffolding, and config for values that do not vary.
- Prefer deletion over addition. If a requested feature is speculative, ship the smallest useful version and say what was intentionally skipped.
- Use comments for why something is done, non-obvious side effects, public APIs, and complex algorithms. Do not comment obvious code.

## Repo-Local Skills

- Repo-local skills live under `.agents/skills` and `.claude/skills`.
- Use the locked skills when their task matches: `better-auth-best-practices` for Better Auth config/session/plugin work, `create-auth-skill` for new auth flows, `ponytail` for minimal/YAGNI work, `ponytail-review`/`ponytail-audit`/`ponytail-debt` when requested, `frontend-design` for new visual direction, `make-interfaces-feel-better` for UI polish, and `shadcn` when touching shadcn/ui or `components.json`.
- Repo instructions override generic skill examples: keep using pnpm, and still do not run `pnpm run auth:generate` in `apps/back`.

## Reference Docs

- When unsure about library or platform behavior, do not speculate. Check the current docs first, then apply the smallest repo-consistent change.
- For non-trivial exploration, use subagents when possible: have them inspect repo patterns, read relevant docs, or compare options in parallel, then make recommendations or code changes only from grounded findings.
- Drizzle ORM: https://github.com/drizzle-team/drizzle-orm
- Cloudflare D1: https://developers.cloudflare.com/d1/index.md
- Cloudflare D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- Cloudflare Workers: https://developers.cloudflare.com/workers/index.md
- Cloudflare Workers TypeScript: https://developers.cloudflare.com/workers/languages/typescript/
- Hono: https://hono.dev/llms.txt
- Hono app generics: https://hono.dev/docs/api/hono#generics
- Hono middleware factory: https://hono.dev/docs/helpers/factory
- TanStack Router: https://raw.githubusercontent.com/tanstack/router/main/docs/router/overview.md
- TanStack Query: https://raw.githubusercontent.com/tanstack/query/main/docs/framework/react/overview.md
- TanStack Form: https://raw.githubusercontent.com/tanstack/form/main/docs/overview.md
- Better Auth: https://better-auth.com/docs
- Vercel AI SDk: https://ai-sdk.dev/docs/introduction

## Commands

- Root checks: `pnpm check`, `pnpm check:types`, `pnpm check:lint`.
- App typechecks must use scripts, not direct `tsc`: run `pnpm run typecheck` inside an app or `pnpm check:types` at the root. The scripts regenerate Wrangler types first.
- Root dev/deploy shortcuts: `pnpm dev:back`, `pnpm dev:front`, `pnpm deploy:back`, `pnpm deploy:front`.
- Backend local D1 migration flow: run `pnpm run db:local` in `apps/back` after Drizzle schema or migration changes. It generates SQL and applies it to Wrangler's local D1 store.
- Worker deploys do not apply D1 migrations. Production D1 migration is separate: run `pnpm run migrate` in `apps/back` with the required `CLOUDFLARE_*` env vars.

## Backend: Cloudflare Workers, Hono, D1

- Hono apps, routers, and middleware should use `AppEnv` from `apps/back/src/lib/types.ts`: `new Hono<AppEnv>()` and `createMiddleware<AppEnv>()`.
- Backend domain errors should use the Hono-native `AppError` helpers from `apps/back/src/lib/errors.ts` (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, etc.). `AppError` extends Hono's `HTTPException`; do not add parallel error classes or per-route `{ error: ... }` response shapes.
- Keep `zValidator("json", schema)` directly in routes for request body validation. Do not wrap it in custom validator abstractions unless the user explicitly approves changing the validation error contract.
- `app.onError` in `apps/back/src/index.ts` owns the JSON error response shape for thrown app errors and unknown 500s. Keep the response shape stable: `{ error: { code, message } }`.
- LogTape is configured in `apps/back/src/index.ts`. Do not enable `honoLogger({ context: true })` unless context-local storage is configured; it causes LogTape startup warnings. Keep the `["logtape", "meta"]` logger above `info` to avoid meta logger noise.
- When `apps/back/wrangler.jsonc` bindings, compatibility dates, or compatibility flags change, run `pnpm run generate-types` in `apps/back`. Wrangler regenerates `worker-configuration.d.ts` from the Worker config; keep `apps/back/src/binding.ts` in sync for bindings app code reads from `c.env`.
- Use `requireAuth` and `requireDriver` from `apps/back/src/middleware/auth.ts` on protected routes. Public Better Auth routes already live under `/api/auth/*` in `apps/back/src/index.ts`.
- Frontend origins are hardcoded in two backend places: `allowedOrigins` in `apps/back/src/index.ts` for CORS and `trustedOrigins` in `apps/back/src/lib/auth.ts` for Better Auth. Update both when adding or changing frontend origins.
- `BETTER_AUTH_URL` in `apps/back/wrangler.jsonc` must match the backend's public origin; update it when the backend URL changes.
- Do not run `pnpm run auth:generate` in `apps/back`. It writes directly to `src/db/schema.ts` and can clobber domain tables. Better Auth tables are already committed; edit schema changes manually.

## Frontend: React, TanStack Router, shadcn

- `apps/front/src/routeTree.gen.ts` is generated by the TanStack Router Vite plugin. Never edit it manually; add routes under `apps/front/src/routes`.
- Protected app pages belong under the `_app` route layout, which performs the session check in `beforeLoad`.
- API/auth clients default to `http://localhost:8787` and read `VITE_API_URL`. If origins change, update frontend env/config plus backend CORS and Better Auth origin settings together.
- TanStack Query keys live in `apps/front/src/lib/query-keys.ts`. Do not write raw query key arrays in route/component code; add keys there so list/detail/profile keys stay consistent.
- Query keys must include every variable used by the query function, including route params and pagination. Example: available requests use `queryKeys.requests.available(page)`, not a fixed `["requests", "available"]`.
- After mutations, invalidate or update every affected query: details plus relevant lists (`requests.my`, `requests.available(page)`, `quotes.my`, `jobs.my`, `drivers.me`). Do not rely on window-focus refetch to repair stale UI.
- `apiFetch` must handle the backend error contract `{ error: { code, message } }`; preserve that shape when changing backend errors.
- Prefer existing shadcn components in `apps/front/src/components/ui` and `cn` from `apps/front/src/lib/utils.ts` before custom UI markup.
- **Always check shadcn docs before building any UI component or form pattern.** If a shadcn component covers the need, use it — do not hand-roll equivalents. Install missing components with `pnpm dlx shadcn@canary add <name>` before writing custom markup. Docs: https://ui.shadcn.com/docs
- **Forms must use TanStack Form + Field components.** All forms use `useForm` from `@tanstack/react-form` with a Zod `schema`, and the `Field` / `FieldLabel` / `FieldError` / `FieldDescription` components from `@/components/ui/field`. Never manage form state with raw `useState`. Validation runs `onBlur` per field; errors render inline under each input via `<FieldError errors={field.state.meta.errors} />`. Docs: https://raw.githubusercontent.com/tanstack/form/main/docs/overview.md

## Linting

- The repo uses `oxlint` for scripts. Do not add ESLint workflow or config changes unless the user explicitly asks for ESLint work.
