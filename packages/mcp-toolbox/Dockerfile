# Multi-stage build for production optimization
# NOTE: This Dockerfile must be built from the repository root to access workspace files
# Run from mcp-toolbox folder: docker build -f Dockerfile -t mcp-toolbox ../..
# Or from repo root: docker build -f packages/mcp-toolbox/Dockerfile -t mcp-toolbox .

# Build stage
FROM node:22-alpine AS builder

# Enable corepack for pnpm
RUN corepack enable

# Set working directory
WORKDIR /workspace

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package.json files for dependency resolution
COPY packages/mcp/package.json ./packages/mcp/
COPY packages/mcp-proxy/package.json ./packages/mcp-proxy/
COPY packages/mcp-toolbox/package.json ./packages/mcp-toolbox/

# Install ALL dependencies (including dev dependencies for building)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code
COPY packages/mcp/ ./packages/mcp/
COPY packages/mcp-proxy/ ./packages/mcp-proxy/
COPY packages/mcp-toolbox/ ./packages/mcp-toolbox/

# Build the packages
WORKDIR /workspace/packages/mcp-proxy
RUN pnpm build

WORKDIR /workspace/packages/mcp
RUN pnpm build

WORKDIR /workspace/packages/mcp-toolbox
RUN pnpm build

# Production stage
FROM node:22-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Enable corepack for pnpm
RUN corepack enable

# Set working directory
WORKDIR /app

# Copy workspace files
COPY --from=builder /workspace/package.json /workspace/pnpm-workspace.yaml /workspace/pnpm-lock.yaml ./

# Copy built packages
COPY --from=builder /workspace/packages/mcp/package.json ./packages/mcp/
COPY --from=builder /workspace/packages/mcp/dist ./packages/mcp/dist

COPY --from=builder /workspace/packages/mcp-proxy/package.json ./packages/mcp-proxy/
COPY --from=builder /workspace/packages/mcp-proxy/dist ./packages/mcp-proxy/dist

COPY --from=builder /workspace/packages/mcp-toolbox/package.json ./packages/mcp-toolbox/
COPY --from=builder /workspace/packages/mcp-toolbox/dist ./packages/mcp-toolbox/dist

# Install build dependencies for native modules
RUN apk add --no-cache --virtual .build-deps \
    make \
    g++ \
    python3

# Install production dependencies only
# This is necessary because:
# 1. The builder stage has ALL dependencies (dev + prod)
# 2. We only want production dependencies in the final image
# 3. This approach ensures proper resolution of workspace dependencies
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Rebuild native dependencies for Alpine Linux
RUN cd /app/packages/mcp-toolbox && pnpm rebuild sqlite3

# Clean up build dependencies
RUN apk del .build-deps

# Create symlinks for workspace packages that use file: protocol
# This is necessary because pnpm doesn't create these symlinks properly with --prod flag
RUN mkdir -p /app/node_modules/@xava-labs && \
    ln -s /app/packages/mcp /app/node_modules/@xava-labs/mcp && \
    ln -s /app/packages/mcp-proxy /app/node_modules/@xava-labs/mcp-proxy

# Create data directory with proper permissions
RUN mkdir -p /app/packages/mcp-toolbox/data && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose ports - main server and health check
EXPOSE ${PORT:-11990}

# Set default environment variables
ENV NODE_ENV=production
ENV PROXY_ID=""
ENV MCP_SERVER_HOST="host.docker.internal:6050"
ENV PORT=11990
ENV DB_PATH=/app/packages/mcp-toolbox/data/packages.db

# Set working directory to mcp-toolbox package
WORKDIR /app/packages/mcp-toolbox

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Use the production start command with proxy-id argument from environment
CMD ["sh", "-c", "node dist/index.js --proxy-id=${PROXY_ID} --mcp-server-host=${MCP_SERVER_HOST}"]