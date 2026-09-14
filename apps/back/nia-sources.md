# Backend Sources

- D1 docs: https://developers.cloudflare.com/d1/ (Nia source `7e984789-4348-4430-904f-15f8238c7fd4`).
- Foreign keys: https://developers.cloudflare.com/d1/sql-api/foreign-keys/ (checked 2026-09-07; targeted Nia results did not cover this page, so read directly).
- D1 enforces foreign keys in implicit transactions. `defer_foreign_keys` allows temporary violations, but does not suppress cascading deletes. Request table rebuilds must preserve child rows and run as a single batch.
