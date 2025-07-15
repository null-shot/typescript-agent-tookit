import {
  McpServer,
  McpRequestContext,
  McpResponse,
} from '@modelcontextprotocol/sdk/mcp';

export class KVMemoryMcpServer extends McpServer<Env> {
  async invoke(
    ctx: McpRequestContext<Env>
  ): Promise<McpResponse> {
    const { input } = ctx.request;

    if (input.action === 'set') {
      await ctx.env.CACHE.put(input.key, input.value);
      return { output: { status: 'ok' } };
    }

    if (input.action === 'get') {
      const value = await ctx.env.CACHE.get(input.key);
      return { output: { value } };
    }

    if (input.action === 'delete') {
      await ctx.env.CACHE.delete(input.key);
      return { output: { status: 'deleted' } };
    }

    return { output: { error: 'Unknown action' } };
  }
}
