#!/bin/bash
set -e

if [ "$1" != "test" ] && [ "$1" != "prod" ]; then
    echo "Usage: ./scripts/deploy.sh [test|prod]"
    exit 1
fi

ENV=$1
APP_NAME="budget-app"
REMOTE_USER="root"

if [ "$ENV" == "test" ]; then
    REMOTE_HOST="docker-test"
    ENV_FILE=".env.test"
else
    REMOTE_HOST="docker-prod"
    ENV_FILE=".env.prod"
fi

echo "🚀 Deploying $APP_NAME to $ENV ($REMOTE_HOST)..."

# 1. Apply any pending database migrations for this environment
echo "🗄️ Checking and applying database migrations for $ENV..."
./scripts/apply_migrations.sh "$ENV"

# Ensure the target directory exists on Proxmox LXC
ssh $REMOTE_USER@$REMOTE_HOST "mkdir -p /root/$APP_NAME"

# Copy all project files over, ignoring build outputs and node_modules
echo "📦 Copying files to $REMOTE_HOST..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.next' --exclude '.env*' --exclude '.DS_Store' . $REMOTE_USER@$REMOTE_HOST:/root/$APP_NAME/

# Copy the specific environment file as .env
echo "🔐 Copying $ENV_FILE to remote .env..."
scp $ENV_FILE $REMOTE_USER@$REMOTE_HOST:/root/$APP_NAME/.env

# Build and start Docker containers via Docker Compose
echo "🐳 Building and starting Docker containers on $REMOTE_HOST..."
ssh $REMOTE_USER@$REMOTE_HOST "cd /root/$APP_NAME && docker compose up -d --build"

echo "✅ Deployment of $APP_NAME to $ENV complete! 🚀"
