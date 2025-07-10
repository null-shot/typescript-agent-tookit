# Docker Deployment Guide

This document explains the Docker image build and deployment process for the MCP WebSocket Server.

## 🐳 Container Registry

Docker images are automatically built and pushed to **GitHub Container Registry (GHCR)** at:
```
ghcr.io/[owner]/[repo]/mcp-toolbox
```

## 🔄 Automated Workflows

### Preview Builds (Pull Requests)

**Workflow:** `.github/workflows/mcp-toolbox-preview.yml`

**Triggers:**
- Pull requests targeting `main` or `develop` branches
- Changes to `packages/mcp-toolbox/**` or `packages/mcp/**`

**Image Tags:**
- `pr-[number]` - PR number based tag
- `pr-[number]-[sha]` - PR number with commit SHA

**Features:**
- ✅ Multi-platform builds (linux/amd64, linux/arm64)
- ✅ Build cache optimization
- ✅ Automatic PR comments with usage instructions
- ✅ Auto-cleanup after 7 days

### Production Builds (Main Branch)

**Workflow:** `.github/workflows/mcp-toolbox-production.yml`

**Triggers:**
- Push to `main` branch
- GitHub releases

**Image Tags:**
- `latest` - Latest main branch build
- `main-[sha]` - Main branch with commit SHA
- `v[version]` - Semantic version tags (on releases)
- `[major].[minor]` - Major.minor version (on releases)
- `[major]` - Major version (on releases)

**Features:**
- ✅ Multi-platform builds (linux/amd64, linux/arm64)
- ✅ Build cache optimization
- ✅ Security vulnerability scanning with Trivy
- ✅ Automatic package metadata updates
- ✅ Deployment summaries

### Cleanup (Scheduled)

**Workflow:** `.github/workflows/cleanup-preview-images.yml`

**Schedule:** Daily at 2:00 AM UTC

**Features:**
- ✅ Automatic cleanup of preview images older than 7 days
- ✅ Manual trigger available
- ✅ Cleanup summaries

## 📦 Using Docker Images

### Pull Latest Production Image

```bash
docker pull ghcr.io/[owner]/[repo]/mcp-toolbox:latest
```

### Pull Specific Preview Image

```bash
docker pull ghcr.io/[owner]/[repo]/mcp-toolbox:pr-123
```

### Run the Server

```bash
docker run -p 3001:3001 \
  -e PORT=3001 \
  -e DB_PATH=/app/data/packages.db \
  -e MCP_PROXY_URL=ws://your-proxy:6050/api/remote-container/ws \
  -v $(pwd)/data:/workspace/packages/mcp-toolbox/data \
  ghcr.io/[owner]/[repo]/mcp-toolbox:latest
```

### Using Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  mcp-toolbox:
    image: ghcr.io/[owner]/[repo]/mcp-toolbox:latest
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - DB_PATH=/app/data/packages.db
      - MCP_PROXY_URL=ws://your-proxy:6050/api/remote-container/ws
    volumes:
      - ./data:/workspace/packages/mcp-toolbox/data
    restart: unless-stopped
```

## 🛠️ Local Development

### Build Image Locally

```bash
# From repository root
docker build -f packages/mcp-toolbox/Dockerfile -t mcp-toolbox .
```

### Run Local Build

```bash
docker run -p 3001:3001 \
  -e PORT=3001 \
  -e DB_PATH=/app/data/packages.db \
  -v $(pwd)/packages/mcp-toolbox/data:/workspace/packages/mcp-toolbox/data \
  mcp-toolbox
```

### Development with Docker Compose

```bash
cd packages/mcp-toolbox
docker-compose up --build
```

## 🔐 Security

### Vulnerability Scanning

Production images are automatically scanned for vulnerabilities using [Trivy](https://trivy.dev/). Results are uploaded to GitHub Security tab.

### Image Signing

Images are built and signed using GitHub's built-in attestation system.

### Access Control

- **Public Images:** Available to everyone
- **Private Images:** Require GitHub authentication

## 📊 Monitoring

### Build Status

Check workflow status in the **Actions** tab of your GitHub repository.

### Image Registry

View all images and versions at:
```
https://github.com/[owner]/[repo]/pkgs/container/mcp-toolbox
```

### Security Alerts

Security scan results are available in the **Security** tab under **Code scanning**.

## 🚀 Deployment Strategies

### Blue-Green Deployment

```bash
# Deploy new version
docker pull ghcr.io/[owner]/[repo]/mcp-toolbox:latest
docker run -d --name mcp-toolbox-green ghcr.io/[owner]/[repo]/mcp-toolbox:latest

# Test the new version
curl http://localhost:3001/

# Switch traffic (update load balancer/proxy)
# Stop old version
docker stop mcp-toolbox-blue
docker rm mcp-toolbox-blue
```

### Rolling Updates with Docker Swarm

```yaml
# docker-stack.yml
version: '3.8'

services:
  server:
    image: ghcr.io/[owner]/[repo]/server:latest
    replicas: 3
    update_config:
      parallelism: 1
      delay: 10s
      failure_action: rollback
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - DB_PATH=/app/data/packages.db
```

```bash
# Deploy stack
docker stack deploy -c docker-stack.yml mcp-server

# Update to new version
docker service update --image ghcr.io/[owner]/[repo]/server:v2.0.0 mcp-server_server
```

## 🐛 Troubleshooting

### Build Failures

1. Check workflow logs in GitHub Actions
2. Verify Dockerfile syntax
3. Ensure all dependencies are available
4. Check for path issues (monorepo structure)

### Runtime Issues

```bash
# Check container logs
docker logs [container-id]

# Access container shell
docker exec -it [container-id] /bin/bash

# Check environment variables
docker exec [container-id] printenv
```

### Image Pull Issues

```bash
# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u [username] --password-stdin

# Check image exists
docker manifest inspect ghcr.io/[owner]/[repo]/server:latest
```

## 📝 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `DB_PATH` | SQLite database path | `/app/data/packages.db` |
| `MCP_PROXY_URL` | MCP proxy WebSocket URL | Required |

### Volume Mounts

| Host Path | Container Path | Purpose |
|-----------|----------------|---------|
| `./data` | `/workspace/packages/server/data` | SQLite database persistence |

### Health Checks

```bash
# HTTP health check
curl http://localhost:3001/

# Expected response
{"status":"ok","message":"MCP WebSocket Server","websocket":"ws://localhost:3001/ws","version":"0.1.0"}
```

## 🔧 Customization

### Custom Build Args

```dockerfile
# Add build args to Dockerfile
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}
```

```bash
# Use build args
docker build --build-arg NODE_VERSION=20 -f packages/server/Dockerfile .
```

### Multi-stage Builds

The current Dockerfile uses a development approach. For production optimization:

```dockerfile
# Production optimized Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
``` 