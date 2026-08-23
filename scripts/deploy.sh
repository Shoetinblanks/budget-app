#!/bin/bash
set -e

# Validate environment argument
if [ "$1" != "test" ] && [ "$1" != "prod" ]; then
    echo "Usage: ./scripts/deploy.sh [test|prod] [--skip-migrate]"
    exit 1
fi

ENV=$1
MIGRATE_FLAG=$2
REGION="us-west1"

if [ "$ENV" == "test" ]; then
    SERVICE_NAME="budget-app-test"
    SECRET_NAME="BUDGET_TEST_SECRETS"
else
    SERVICE_NAME="budget-app"
    SECRET_NAME="BUDGET_PROD_SECRETS"
fi

echo "================================================="
echo "Deploying Budget App to Cloud Run ($ENV environment)"
echo "================================================="

if [ "$2" != "--skip-migrate" ]; then
    echo "-> Checking and applying any pending database schema updates..."
    ./scripts/apply_migrations.sh "$ENV"
fi

echo "-> Fetching secrets from Google Secret Manager ($SECRET_NAME)..."
gcloud secrets versions access latest --secret="$SECRET_NAME" > /tmp/deploy_secrets.env

if [ ! -s /tmp/deploy_secrets.env ]; then
    echo "❌ Failed to retrieve secrets. Exiting."
    rm -f /tmp/deploy_secrets.env
    exit 1
fi

echo "-> Converting secrets to YAML for Cloud Buildpacks..."
> /tmp/deploy_secrets.yaml
while IFS='=' read -r key value; do
    # Skip empty lines and comments
    if [[ -z "$key" ]] || [[ "$key" == \#* ]]; then
        continue
    fi
    # Strip leading/trailing quotes from value
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
    # Escape double quotes in value for YAML
    value=$(echo "$value" | sed 's/"/\\"/g')
    echo "${key}: \"${value}\"" >> /tmp/deploy_secrets.yaml
done < /tmp/deploy_secrets.env


echo "-> Triggering Cloud Run deployment..."
echo "Note: Google Cloud will automatically build your Next.js project. This takes 3-5 minutes."

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --env-vars-file="/tmp/deploy_secrets.yaml" \
  --build-env-vars-file="/tmp/deploy_secrets.yaml"

echo "-> Cleaning up temporary files..."
rm -f /tmp/deploy_secrets.env /tmp/deploy_secrets.yaml

echo "✅ Deployment complete for $ENV!"
