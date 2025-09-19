# MCP Playground Showcase

A Next.js application showcasing the `@nullshot/playground` React component library for building MCP (Model Context Protocol) server management interfaces.

## 🚀 Features

- **Full Playground Demo**: Experience the complete MCP playground interface
- **Component Gallery**: Browse individual components and their features
- **Integration Examples**: Learn different ways to integrate the components
- **Live Code Examples**: See real implementation patterns
- **Cloudflare Pages Ready**: Optimized for deployment on Cloudflare Pages

## 📦 What's Included

### Pages

- **Homepage** (`/`): Overview and introduction to the playground components
- **Full Playground** (`/playground`): Complete playground interface demo
- **Components** (`/components`): Individual component showcase with features
- **Examples** (`/examples`): Integration patterns and code examples

### Components Showcased

- **Chat Interface**: Full-featured chat with streaming, history, and AI integration
- **MCP Server Directory**: Server management with real-time status updates
- **Model Selector**: AI model configuration and selection with support for 6 providers (OpenAI, Anthropic, DeepSeek, Workers AI, Gemini, Grok)
- **Configuration Provider**: Flexible theming and proxy configuration

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/cloudflare/typescript-agent-vibework.git
cd typescript-agent-vibework/examples/playground-showcase

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The application will be available at `http://localhost:3000`.

### Building for Production

```bash
# Build for static export
pnpm build

# Preview the build
pnpm preview
```

## 🚀 Deployment

### Cloudflare Pages

This project is optimized for Cloudflare Pages with static export:

```bash
# Deploy to Cloudflare Pages
pnpm deploy
```

Or connect your GitHub repository to Cloudflare Pages with these settings:

- **Build command**: `pnpm build`
- **Build output directory**: `out`
- **Root directory**: `examples/playground-showcase`

### Other Static Hosts

The project exports to static files and can be deployed to:

- Vercel
- Netlify
- GitHub Pages
- Any static file hosting service

## 🔧 Configuration

### MCP Proxy Configuration

The showcase uses these default MCP proxy settings:

```typescript
{
  mcpProxyUrl: 'http://localhost:6050',
  mcpProxyWsUrl: 'ws://localhost:6050/client/ws',
  theme: 'dark'
}
```

To use with your own MCP proxy, update the configuration in the page components.

### Environment Variables

Create a `.env.local` file for any environment-specific settings:

```bash
# Optional: Custom MCP proxy URLs
NEXT_PUBLIC_MCP_PROXY_URL=http://localhost:6050
NEXT_PUBLIC_MCP_PROXY_WS_URL=ws://localhost:6050/client/ws

# Optional: AI model API keys for examples
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_key
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_key
NEXT_PUBLIC_DEEPSEEK_API_KEY=your_deepseek_key
NEXT_PUBLIC_GOOGLE_API_KEY=your_google_api_key
NEXT_PUBLIC_GROK_API_KEY=your_grok_api_key
NEXT_PUBLIC_CLOUDFLARE_API_KEY=your_cloudflare_api_key
```

## 🎨 Customization

### Styling

The project uses Tailwind CSS with a dark theme by default. Customize the theme in:

- `src/app/globals.css` - CSS custom properties
- `tailwind.config.js` - Tailwind configuration
- Component props - Individual component styling

### Adding Custom Examples

Add new examples by:

1. Creating a new page in `src/app/examples/[example-name]/page.tsx`
2. Adding the example to the examples list in `src/app/examples/page.tsx`
3. Creating documentation in the examples section

## 🔗 Related Projects

- [`@nullshot/playground`](../../packages/playground) - The component library being showcased
- [`@nullshot/mcp`](../../packages/mcp) - MCP server implementation for Cloudflare Workers
- [MCP Proxy](../../packages/mcp-proxy) - Proxy server for MCP connections

## 📖 Documentation

- [Playground Component Documentation](../../packages/playground/README.md)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Integration Examples](./src/app/examples/page.tsx)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## 🙋‍♂️ Support

- [GitHub Issues](https://github.com/cloudflare/typescript-agent-vibework/issues)
- [Documentation](../../README.md)
- [MCP Community](https://github.com/modelcontextprotocol)
