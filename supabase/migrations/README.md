# Budget App Database Migrations

This folder stores version-controlled SQL migration files.

## How It Works
1. When you make database schema changes on Test (e.g. adding new tables, altering columns, adding triggers, or creating RLS policies), create a new SQL file here.
2. Naming convention: `YYYYMMDD_HHMMSS_<description>.sql` (e.g., `20260820_01_create_accounts.sql`).
3. Run `./scripts/apply_migrations.sh test` to apply it to the Test database (`budget_preview`).
4. Run `./scripts/apply_migrations.sh prod` (or `./deploy_prod.sh` / `./deploy_all.sh`) to apply it to the Production database (`budget_prod`) before deploying.

Each migration runs inside a transaction and is recorded in the `public._migrations` table so it is never run twice. When applied to Prod, the script automatically moves the file to `supabase/migrations_archive/`.
