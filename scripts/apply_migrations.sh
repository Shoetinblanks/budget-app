#!/usr/bin/env bash
# ==============================================================================
# Budget App: Database Migration Runner (Test & Prod)
# ==============================================================================
# Applies incremental SQL migrations from supabase/migrations/ to the VM database.
# Tracks applied migrations in the `public._migrations` table to prevent re-execution.
# ==============================================================================

set -e

if [ "$1" != "test" ] && [ "$1" != "prod" ]; then
    echo "Usage: ./scripts/apply_migrations.sh [test|prod]"
    echo "Example: ./scripts/apply_migrations.sh prod"
    exit 1
fi

ENV=$1
VM="supabase-central-db"
ZONE="us-west4-c"
USER="shoetinblanksllc"
DB_CONTAINER="daycare-db"

if [ "$ENV" == "prod" ]; then
    TARGET_DB="budget_prod"
else
    TARGET_DB="budget_preview"
fi

MIGRATIONS_DIR="./supabase/migrations"

echo "================================================================="
echo "   Budget App: Running Migrations for [$ENV] ($TARGET_DB)        "
echo "================================================================="

if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "⚠️ Migrations directory $MIGRATIONS_DIR does not exist. Creating it..."
    mkdir -p "$MIGRATIONS_DIR"
fi

# Ensure migration table exists
echo "-> Ensuring tracking table (public._migrations) exists..."
gcloud compute ssh "${USER}@${VM}" --zone="$ZONE" --command="sudo docker exec -i $DB_CONTAINER psql -U supabase_admin -d $TARGET_DB -c \"
CREATE TABLE IF NOT EXISTS public._migrations (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);\"" 2>/dev/null || true

# Find all SQL files sorted
MIGRATION_FILES=$(find "$MIGRATIONS_DIR" -type f -name "*.sql" 2>/dev/null | sort)

if [ -z "$MIGRATION_FILES" ]; then
    echo "ℹ️ No migration files found in $MIGRATIONS_DIR."
    echo "✅ Database is up to date."
    exit 0
fi

for FILE in $MIGRATION_FILES; do
    FILENAME=$(basename "$FILE")
    
    # Check if migration is already applied
    ALREADY_APPLIED=$(gcloud compute ssh "${USER}@${VM}" --zone="$ZONE" --command="sudo docker exec -i $DB_CONTAINER psql -U supabase_admin -d $TARGET_DB -t -A -c \"SELECT 1 FROM public._migrations WHERE name = '$FILENAME';\"" 2>/dev/null || true)
    
    if [ "$ALREADY_APPLIED" == "1" ]; then
        echo "  [SKIP] $FILENAME (already applied)"
    else
        echo "  [APPLYING] $FILENAME ..."
        # Upload migration SQL to temp file on VM
        gcloud compute scp "$FILE" "${USER}@${VM}:/tmp/current_migration.sql" --zone="$ZONE"
        
        # Execute inside transaction and record in _migrations
        gcloud compute ssh "${USER}@${VM}" --zone="$ZONE" --command="(echo 'BEGIN;'; cat /tmp/current_migration.sql; echo \"INSERT INTO public._migrations (name) VALUES ('$FILENAME'); COMMIT;\") | sudo docker exec -i $DB_CONTAINER psql -U supabase_admin -d $TARGET_DB"
        gcloud compute ssh "${USER}@${VM}" --zone="$ZONE" --command="rm -f /tmp/current_migration.sql"
        echo "  ✅ Successfully applied $FILENAME"
    fi
done

if [ "$ENV" == "prod" ]; then
    ARCHIVE_DIR="./supabase/migrations_archive"
    mkdir -p "$ARCHIVE_DIR"
    echo "-> Archiving applied migration files to $ARCHIVE_DIR..."
    for FILE in $MIGRATION_FILES; do
        if [ -f "$FILE" ]; then
            mv "$FILE" "$ARCHIVE_DIR/"
            echo "  📦 Archived $(basename "$FILE")"
        fi
    done
fi

echo "================================================================="
echo "   🎉 All migrations processed successfully for [$ENV]!        "
echo "================================================================="
