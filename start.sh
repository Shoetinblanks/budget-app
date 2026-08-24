#!/bin/sh
set -e

echo "=== Initializing Userspace Tailscale ==="

mkdir -p /var/run/tailscale /var/cache/tailscale /var/lib/tailscale

# Start tailscaled in userspace networking mode
/app/tailscaled --tun=userspace-networking --socks5-server=localhost:1055 --outbound-http-proxy-listen=localhost:1055 &

# Wait for tailscaled socket to be ready
until [ -S /var/run/tailscale/tailscaled.sock ]; do
  sleep 0.1
done

# Authenticate and connect to Tailscale network
if [ -n "${TAILSCALE_AUTHKEY}" ]; then
  HOSTNAME_VAL="${TAILSCALE_HOSTNAME:-budget-staging}"
  TAGS_ARG=""
  if [ -n "${TAILSCALE_TAGS}" ]; then
    TAGS_ARG="--advertise-tags=${TAILSCALE_TAGS}"
  fi
  echo "Executing /app/tailscale up with hostname=${HOSTNAME_VAL} and tags=${TAILSCALE_TAGS}..."
  /app/tailscale up --authkey="${TAILSCALE_AUTHKEY}" --hostname="${HOSTNAME_VAL}" ${TAGS_ARG} --accept-dns=false
  echo "✅ Tailscale mesh connected!"
else
  echo "⚠️ TAILSCALE_AUTHKEY not set. Continuing without Tailscale..."
fi

# Set proxy environment variables for userspace networking
export ALL_PROXY="socks5://localhost:1055"
export HTTP_PROXY="http://localhost:1055"
export HTTPS_PROXY="http://localhost:1055"
export http_proxy="http://localhost:1055"
export https_proxy="http://localhost:1055"

echo "=== Starting Next.js Server on port ${PORT:-8080} ==="
exec node server.js
