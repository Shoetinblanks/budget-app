#!/usr/bin/env bash
# ==============================================================================
# Budget App: Database Migration Runner (Test & Prod)
# ==============================================================================
set -e

if [ "$1" != "test" ] && [ "$1" != "prod" ]; then
    echo "Usage: ./scripts/apply_migrations.sh [test|prod]"
    echo "Example: ./scripts/apply_migrations.sh prod"
    exit 1
fi

node scripts/apply_migrations.mjs "$1"
