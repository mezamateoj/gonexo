# Backend

## Local D1

Drizzle owns the schema and generates SQL into `drizzle/`. Wrangler owns the local D1 runtime store used by `wrangler dev`.

```txt
pnpm run db:local
pnpm run dev
```

Run `db:local` after creating or changing Drizzle migrations. It generates SQL and applies it to local D1. `pnpm run dev` just starts the Worker.

The local database is not your production D1 database. Wrangler uses the `preview_database_id` from `wrangler.jsonc` and persists local D1 state under `.wrangler/`.

## Production D1 migrations

Production uses `drizzle-kit migrate` with the D1 HTTP driver. That driver sends every `--> statement-breakpoint` section as a separate request. Because D1 pragmas only last for the current transaction, a generated table-rebuild migration that starts with `PRAGMA defer_foreign_keys=ON` must not contain statement breakpoints. Remove all of them so the migration is submitted as one transactional batch.

Before deploying a table rebuild:

1. Seed the previous schema with related parent and child rows.
2. Apply the migration and verify the rows and foreign keys are preserved.
3. Check that the migration contains no statement breakpoints when it relies on deferred foreign keys.

After a failed production migration, inspect `__drizzle_migrations` and any `__new_*` tables before retrying. D1 HTTP migrations can persist statements completed before the failure, so the migration may need an explicit, data-safe cleanup for temporary tables.

```txt
pnpm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
pnpm run generate-types
```

Pass the `CloudflareBindings` as generics when instantiating `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
