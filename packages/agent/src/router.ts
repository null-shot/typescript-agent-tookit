import { Hono } from "hono";
import { AgentEnv } from "./env";
import { cors } from "hono/cors";


export class AgentRouterBuilder<T extends AgentEnv> {
    private app: Hono<{ Bindings: T }>;

    constructor(app: Hono<{ Bindings: T }>) {
        this.app = app;
    }

    public applyRoutes(func: (app: Hono<{ Bindings: T }>) => void) {
        func(this.app);
        return this;
    }

    public build() {
        return this.app;
    }
}
/*
    This router is used to handle permissionless sessions where anyone can access the chat by knowing the unique session id
*/
export function permissionlessAgentSessionRouter<T extends AgentEnv>(app: Hono<{ Bindings: T }>) : Hono<{ Bindings: T }> {
    console.log("Setting up permissionless agent session router");
    // Add CORS middleware
    app.use('*', cors({
      origin: '*', // Allow any origin for development; restrict this in production
      allowMethods: ['POST', 'GET', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: ['X-Session-Id'],
      maxAge: 86400, // 24 hours
    }));

    // Route all requests to the durable object instance based on session
    app.all('*', async (c) => {
        const { AgentDurableObject } = c.env
        var sessionIdStr = c.req.param('sessionId')

        if (!sessionIdStr) {
            sessionIdStr = crypto.randomUUID();
        }

        const id =  AgentDurableObject.idFromName(sessionIdStr);

        console.log(`Fetching durable object instance: ${sessionIdStr} to do id: ${id}`);

        return AgentDurableObject.get(id).fetch(new Request(
            c.req.url,
            c.req.raw
        ));
    });

    return app;
}