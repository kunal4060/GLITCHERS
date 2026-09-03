# ============================================================
# Stage 1: Build Shared Types and Backend TypeScript
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

RUN npm ci

# Copy source files
COPY shared/ ./shared/
COPY backend/ ./backend/

# Build shared first, then backend
WORKDIR /app/shared
RUN npm run build

WORKDIR /app/backend
RUN npm run build

# ============================================================
# Stage 2: Production Runtime
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0

# Install curl for docker healthcheck
RUN apk add --no-cache curl

# Copy package descriptors
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built artifacts from builder stage
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist

WORKDIR /app/backend

# Expose backend port
EXPOSE 5000

# Docker Healthcheck against the new /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start Fastify server
CMD ["node", "dist/server.js"]
