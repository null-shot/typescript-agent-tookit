# 🌐 Null Shot - Typescript Agent Framework

<div align="center">
  <h3>Building the future of AI Agent Interoperability</h3>
  <p><i>Pre-Alpha: This project is in active development.</i></p>
</div>

[![Discord](https://img.shields.io/discord/1358691448173625468?style=flat)](https://discord.gg/acwpp6zWEc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Welcome to a new paradigm in AI development. MCP provides the foundation for building intelligent, interoperable agents that can communicate, evolve, and generate value at the edge of the network.

## Vision

We're extending [Cloudflare's vision for AI Agents](https://blog.cloudflare.com/making-cloudflare-the-best-platform-for-ai-agents) with a focus on web3 and MCPs as plugins:

- 🤝 AI Agents as teammates/organizations generating revenue and performing advanced operations
- 💰 Cost-effective shared hosting options
- 🔒 Secure sensitive assets (trading agents, treasuries, etc.)
- 📈 Self-improving agents based on collective usage
- 💸 Drive MCP usage revenue to open source contributors
- 💼 Monetization avenues for closed-source MCP use cases
- ⚙️ Seamless configuration options
- 🚀 Quick iteration on ideas locally and in-cloud
- 🔓 No vendor lock-in, self-hosting and personal account options

## Project Status

This project is in pre-alpha and actively evolving. Current focus areas:

### Ready for Use

- ✅ Core MCP Framework
- ✅ Multi Session & Authentication Patterns
- ✅ Official MCP WebSocket Support and HTTP Streaming Support
- ✅ Agent Framework (AI SDK)
- ✅ Seamless MCP Plugins (mcp.json) for Agents
- ✅ Agent MCP Dependency Management
- ✅ MCP Webhook / External Service Support
- ✅ Playground UI for LLMs + MCPs

### In Development

- ☁️ Cloudflare Service Examples (KV, D1, DO state, Analytics, Workflows, Schema Migrations)
- 🤖 LangChain and Agent SDK examples coming soon
- 📄 Cloudflare Pages (SSE / Fullstack) Examples
- 🔑 Authentication (OAuth, JWT)

## Quick Start

Get started with the Null Shot CLI to create MCP servers and AI agents:

### Install the CLI

```bash
npm install -g @nullshot/cli
```

### Create a new MCP server

```bash
nullshot create mcp
```

### Create a new Agent

```bash
nullshot create agent
```

### Initialize MCP configuration in existing project

```bash
nullshot init
```

### Install MCP dependencies

```bash
nullshot install
```

### Run in development mode

```bash
nullshot dev
```

## Documentation

Comprehensive documentation is available at [Null Shot Docs](https://nullshot.ai/docs):

- **[Project Overview](https://nullshot.ai/docs)** - Get started with Null Shot
- **[Agent Framework - Getting Started](https://nullshot.ai/en/docs/developers/agents-framework/overview)** - Build AI agents with Cloudflare Workers
- **[MCP Framework Overview](https://nullshot.ai/en/docs/developers/mcp-framework/overview)** - Model Context Protocol implementation
- **[Platform Overview](https://nullshot.ai/en/docs/developers/platform/overview)** - Understanding the platform architecture
- **[Common Services](https://nullshot.ai/en/docs/developers/services/overview)** - Cloudflare services integration
- **[Playground](https://nullshot.ai/en/docs/developers/playground)** - Interactive development environment

## Release Process

This repository uses an automated release workflow following semantic versioning:

1. **Pull Request Testing** - When you create a PR, it automatically runs tests and a semantic-release dry run
2. **Automated Publishing** - When merged to main, changed packages are automatically published to npm
3. **Versioning** - Package versions are determined by [Conventional Commits](https://www.conventionalcommits.org/) standards

For detailed information about our release process, see [.github/RELEASE_PROCESS.md](.github/RELEASE_PROCESS.md).

## Contributing

We welcome contributions! Our vision is to create a collaborative ecosystem where AI and human developers work together. Soon, we'll have an AI agent to audit and govern contributions based on our shared vision.

If you're interested in contributing, please:

1. Join our [Discord community](https://discord.gg/acwpp6zWEc)
2. Watch this repository for updates
3. Star the project if you find it interesting

## License

MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <i>Built with ❤️ by the Xava DAO Community</i>
</div>
