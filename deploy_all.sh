#!/bin/bash
set -e

echo "================================================="
echo "🚀 Deploying Budget App to both TEST and PROD"
echo "================================================="

echo ""
echo "--- [1/2] Deploying to TEST ---"
./deploy_test.sh "$@"

echo ""
echo "--- [2/2] Deploying to PROD ---"
./deploy_prod.sh "$@"

echo ""
echo "================================================="
echo "🎉 ALL DEPLOYMENTS COMPLETED SUCCESSFULLY!"
echo "================================================="
