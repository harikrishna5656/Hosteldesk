# Multi-stage Dockerfile for HostelPMS Frontend

# 1. Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

# Build arguments for Vite environment variables
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL
ENV NITRO_PRESET=node-server

# Install dependencies (using legacy peer deps for React 19 compatibility)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source and configuration files
COPY . .

# Build production bundle using Nitro node-server preset
RUN npm run build

# 2. Production Runner Stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy prebuilt server and public assets from builder
COPY --from=builder /app/.output ./.output

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# Start the standalone Node.js Nitro server
CMD ["node", ".output/server/index.mjs"]
