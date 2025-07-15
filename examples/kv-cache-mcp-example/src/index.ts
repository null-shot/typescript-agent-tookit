// src/index.ts
import { KVCacheMcpServer } from './server';

export interface Env {
  CACHE: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/cache/get') {
      const key = url.searchParams.get('key');
      if (!key) return new Response('Missing key', { status: 400 });
      const value = await env.CACHE.get(key);
      return new Response(value ?? 'null');
    }

    if (url.pathname === '/cache/set' && request.method === 'POST') {
      const { key, value } = await request.json();
      if (!key || value === undefined) return new Response('Missing key or value', { status: 400 });
      await env.CACHE.put(key, value);
      return new Response('OK');
    }

    if (url.pathname === '/cache/delete' && request.method === 'POST') {
      const { key } = await request.json();
      if (!key) return new Response('Missing key', { status: 400 });
      await env.CACHE.delete(key);
      return new Response('Deleted');
    }

    return new Response('Not found', { status: 404 });
  },
};
