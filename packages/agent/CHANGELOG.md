# @nullshot/agent

## 0.3.3

### Patch Changes

- e4d4d56: Minor bump to sync with git repository

## 0.3.2

### Patch Changes

- db629e0: Fix MCP Json format and default MCP tools on CLI with v5 AI SDK Tested and working

## 0.3.1

### Patch Changes

- c35a604: Fix dependencies

## 0.3.0

### Minor Changes

- 4af1485: New repo, agents dependency bumps, cli tool

## 0.2.0

### Minor Changes

- 0e0ff2d: Fixing versions to align them

## 0.0.2

### Patch Changes

- 4ae1bd8: \* Agent Framework using AI SDK and Cloudflare native primitives
  - Services - Add routes to Agent
  - Router - Likely an Agent Gateway, manages sessions, routing to agents, and CORS.
  - Playground - A place for chatting with agents (and soon MCPs)
  - Middleware - Inject tools, params, and modify LLM responses
  - Example simple prompt agent (Bootstraps TODO List MCP + Playground)
