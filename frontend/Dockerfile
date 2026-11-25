# Multi-stage Dockerfile for HostelPMS Frontend

# 1. Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for Vite environment variables
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

# Install dependencies (using legacy peer deps for modern React 19 packages)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source and config files
COPY . .

# Build production bundle
RUN npm run build

# 2. Production Runner Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies for serving
COPY package*.json ./
RUN npm install --legacy-peer-deps && npm cache clean --force

# Copy built application and required assets from builder stage
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/vite.config.ts ./vite.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/wrangler.jsonc ./wrangler.jsonc

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Serve the prebuilt production app
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "3000"]
