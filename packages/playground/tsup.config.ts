import { defineConfig } from 'tsup';
import { copyFileSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  entry: ['src/lib/exports/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    'next',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-label',
    '@radix-ui/react-slot',
    'lucide-react',
    'class-variance-authority',
    'clsx',
    'tailwind-merge',
    'vaul',
    'zod',
    'ai',
    '@ai-sdk/anthropic',
    '@ai-sdk/openai',
    '@ai-sdk/react',
    'date-fns',
    'fuse.js',
    '@modelcontextprotocol/sdk',
    'agents',
    '@xava-labs/mcp'
  ],
  esbuildOptions(options) {
    options.banner = {
      js: '"use client";'
    };
  },
  onSuccess: async () => {
    // Copy CSS file to dist after successful build
    console.log('Copying styles.css to dist...');
    try {
      copyFileSync(
        join(process.cwd(), 'src/lib/exports/styles.css'),
        join(process.cwd(), 'dist/styles.css')
      );
      console.log('Successfully copied styles.css');
    } catch (error) {
      console.error('Failed to copy styles.css:', error);
    }
  }
}); 