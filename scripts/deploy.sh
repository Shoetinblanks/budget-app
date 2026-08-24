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
    TS_HOSTNAME="budget-staging"
else
    SERVICE_NAME="budget-app"
    SECRET_NAME="BUDGET_PROD_SECRETS"
    TS_HOSTNAME="budget-prod"
fi

echo "================================================="
echo "Deploying Budget App to Cloud Run ($ENV environment)"
echo "Service: $SERVICE_NAME"
echo "================================================="

echo "-> Fetching shared infrastructure secrets (SHARED_INFRA_SECRETS)..."
gcloud secrets versions access latest --secret="SHARED_INFRA_SECRETS" > /tmp/deploy_secrets.env 2>/dev/null || true

echo "-> Fetching app secrets from Google Secret Manager ($SECRET_NAME)..."
gcloud secrets versions access latest --secret="$SECRET_NAME" >> /tmp/deploy_secrets.env

echo "TAILSCALE_HOSTNAME=${TS_HOSTNAME}" >> /tmp/deploy_secrets.env

if [ ! -s /tmp/deploy_secrets.env ]; then
    echo "❌ Failed to retrieve secrets. Exiting."
    rm -f /tmp/deploy_secrets.env
    exit 1
fi

echo "-> Converting secrets to YAML for Cloud Run..."
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

echo "-> Triggering Cloud Run deployment via Dockerfile..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --clear-base-image \
  --env-vars-file="/tmp/deploy_secrets.yaml"

echo "-> Cleaning up temporary secret files..."
rm -f /tmp/deploy_secrets.env /tmp/deploy_secrets.yaml

echo "✅ Deployment complete for $ENV!"
