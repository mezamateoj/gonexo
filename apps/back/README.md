# Backend

## Local D1

Drizzle owns the schema and generates SQL into `drizzle/`. Wrangler owns the local D1 runtime store used by `wrangler dev`.

```txt
pnpm run db:local
pnpm run dev
```

Run `db:local` after creating or changing Drizzle migrations. It generates SQL and applies it to local D1. `pnpm run dev` just starts the Worker.

The local database is not your production D1 database. Wrangler uses the `preview_database_id` from `wrangler.jsonc` and persists local D1 state under `.wrangler/`.

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
