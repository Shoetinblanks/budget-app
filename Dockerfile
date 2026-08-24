# Step 1: Tailscale Binaries
FROM alpine:latest AS tailscale
WORKDIR /tailscale
ENV TAILSCALE_VERSION="1.78.1"
RUN apk add --no-cache curl ca-certificates && \
    ARCH=$(uname -m) && \
    case "${ARCH}" in \
      x86_64) TSARCH="amd64" ;; \
      aarch64) TSARCH="arm64" ;; \
      *) TSARCH="amd64" ;; \
    esac && \
    curl -fsSL "https://pkgs.tailscale.com/stable/tailscale_${TAILSCALE_VERSION}_${TSARCH}.tgz" -o tailscale.tgz && \
    tar xzf tailscale.tgz --strip-components=1

# Step 2: Base & Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Step 3: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Step 4: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache ca-certificates iptables iproute2

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Copy Tailscale binaries
COPY --from=tailscale /tailscale/tailscaled /app/tailscaled
COPY --from=tailscale /tailscale/tailscale /app/tailscale

# Copy Next.js standalone artifacts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh /app/tailscaled /app/tailscale

EXPOSE 8080

ENTRYPOINT ["/app/start.sh"]
