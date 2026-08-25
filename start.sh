#!/bin/sh
set -e

echo "=== Starting Next.js Server on port ${PORT:-3000} ==="
exec node server.js
