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

# Build mcp-toolbox package (prebuild script will ensure transports are built)
RUN cd packages/mcp-toolbox && pnpm build && pnpm run build:bundle

# Production stage
FROM node:22-alpine AS production

# Install Python and pip for uvx support
RUN apk add --no-cache python3 py3-pip

# Update pip and install uv (which includes uvx)
RUN pip3 install --upgrade pip
RUN pip3 install --break-system-packages uv

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy only the bundled file and package.json
COPY --from=builder /workspace/packages/mcp-toolbox/dist/bundle.js ./bundle.js
COPY --from=builder /workspace/packages/mcp-toolbox/package.json ./package.json

# Create data directory with proper permissions
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose ports
EXPOSE ${PORT:-11990}

# Set default environment variables
ENV NODE_ENV=production
ENV PROXY_ID=""
ENV MCP_SERVER_HOST="host.docker.internal:6050"
ENV PORT=11990
ENV DB_PATH=/app/data/packages.db

ENTRYPOINT ["sh", "-c", "node bundle.js --proxy-id=${PROXY_ID} --mcp-server-host=${MCP_SERVER_HOST}"]