# MCP Toolbox Deployment Guide

This guide covers deploying the MCP Toolbox using Docker and GitHub Container Registry.

## 🐳 Docker Image

The MCP Toolbox is packaged as a production-ready Docker image with:
- Multi-stage build for minimal image size
- Node.js Alpine base for security and performance
- Non-root user execution
- Proper signal handling with dumb-init
- Health check endpoint
- Multi-architecture support (amd64, arm64)

## 📦 GitHub Container Registry

Images are automatically built and pushed to GitHub Container Registry (ghcr.io) on:
- Push to `main` branch (tagged as `latest`)
- Push to `develop` branch (tagged as `develop`)
- Pull requests (tagged as `pr-{number}`)
- Git tags (semantic versioning)

### Image Location
```
ghcr.io/{owner}/{repo}/mcp-toolbox
```

## 🚀 Quick Start

### Local Development (Docker Desktop)
```bash
# Pull the image
docker pull ghcr.io/{owner}/{repo}/mcp-toolbox:latest

# Run locally - connects to MCP proxy on host machine
docker run -d \
  --name mcp-toolbox \
  -p 11990:11990 \
  -e PROXY_ID="local-dev-toolbox" \
  --add-host host.docker.internal:host-gateway \
  -v $(pwd)/data:/app/packages/mcp-toolbox/data \
  ghcr.io/{owner}/{repo}/mcp-toolbox:latest
```

### Cloud/Production Deployment
```bash
# Run in cloud - specify actual MCP proxy server
docker run -d \
  --name mcp-toolbox \
  -p 11990:11990 \
  -e PROXY_ID="prod-toolbox-01" \
  -e MCP_SERVER_HOST="mcp-proxy.yourdomain.com:6050" \
  -v /data/mcp-toolbox:/app/packages/mcp-toolbox/data \
  ghcr.io/{owner}/{repo}/mcp-toolbox:latest
```

### Testing the Container
```bash
# Check if services are running
curl http://localhost:11990/        # Main API
curl http://localhost:11990/health  # Health check

# Expected responses:
# Main API: {"status":"ok","message":"MCP WebSocket Server"...}
# Health: {"status":"ok","message":"pong","mcpProxyConnected":true...}
```

## 🔧 Configuration

## 🏗️ Architecture

The MCP Toolbox consists of:
- **Main HTTP Server** (Port 3001): REST API for managing MCP servers, WebSocket connections
- **Health Check Server** (Port 11990): Dedicated health monitoring endpoint
- **MCP Proxy Connection**: WebSocket client that connects to your MCP proxy server

### Required Environment Variables
- `PROXY_ID`: Unique identifier for this MCP toolbox instance

### Optional Environment Variables
- `MCP_SERVER_HOST`: Host and port of your MCP proxy server 
  - **Local Docker**: `host.docker.internal:6050` (default)
  - **Cloud/Production**: Set to your actual proxy server address
- `PORT`: Main server port (default: `3001`)
- `HEALTH_CHECK_PORT`: Health check endpoint port (default: `11990`)
- `DB_PATH`: SQLite database path (default: `/app/packages/mcp-toolbox/data/packages.db`)

## 📋 Docker Compose

### Basic Setup
```yaml
version: '3.8'

services:
  mcp-toolbox:
    image: ghcr.io/{owner}/{repo}/mcp-toolbox:latest
    ports:
      - "3001:3001"
      - "11990:11990"
    environment:
      - PROXY_ID=your-unique-proxy-id
      - MCP_SERVER_HOST=mcp-proxy:6050
    volumes:
      - ./data:/app/packages/mcp-toolbox/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:11990/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
``` 