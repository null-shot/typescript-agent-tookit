import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { AgentEnv } from './env';
import {  Service, isExternalService } from './service';


/**
 * The Null Shot Standard for Agents.
 */
export abstract class XavaAgent<ENV extends AgentEnv = AgentEnv, MESSAGE extends any = any> extends DurableObject<ENV> {
  protected state: DurableObjectState;
  protected env: ENV;
  protected app: Hono<{ Bindings: ENV }>;
  protected services: Service[];

  constructor(state: DurableObjectState, env: ENV, services: Service[] = []) {
    super(state, env);
    this.state = state;
    this.env = env;
    this.app = new Hono<{ Bindings: ENV }>();
    this.services = services;

    // Setup routes
    this.setupRoutes(this.app);
    
    // Since this is ran async, implementing classes below should be initialized prior to this running
    state.blockConcurrencyWhile(async () => {
      // Initialize services before setting up routes
      await this.initializeServices();
    });
  }

  abstract processMessage(sessionId: string, messages: MESSAGE): Promise<Response>;

  /**
   * Setup services for the agent
   * This can be overridden by subclasses to add custom services
   */
   protected async initializeServices(): Promise<void> {
    // Initialize all services
    for (const service of this.services) {
      console.log("Initializing service", service);
      if (service.initialize) {
        await service.initialize();
      }
      
      // Register routes for external services
      if (isExternalService(service)) {
        service.registerRoutes(this.app);
      }
    }
  }

  /**
   * Setup Hono routes
   */
  protected setupRoutes(app: Hono<{ Bindings: ENV }>) {
    // Message processing route with sessionId as URL parameter
    app.post('/agent/chat/:sessionId', async (c) => {
      try {
        // Get sessionId from URL params or generate a new one
        const sessionId = c.req.param('sessionId')

        if (!sessionId) {
          throw new HTTPException(400, {
            message: 'Session ID is required'
          });
        }

        // Get the payload from the request
        const messages = await c.req.json<MESSAGE>();

        if (!messages) {
          throw new HTTPException(400, {
            message: 'Payload must be a valid CoreMessage[] JSON Object CoreMessage[]'
          });
        }
                
        const response = await this.processMessage(sessionId, messages);

        response.headers.set('X-Session-Id', sessionId);

        return response;
      } catch (error) {
        console.error('Error processing message:', error);
        
        // Handle JSON parsing errors specifically
        if (error instanceof SyntaxError) {
          throw new HTTPException(400, {
            message: 'Invalid JSON in request body'
          });
        }
        // Handle other errors
        throw new HTTPException(500, {
          message: 'Internal server error'
        });
      }
    });

    // Default 404 route
    app.notFound(() => {
      return new Response('Not found', { status: 404 });
    });
  }

   /**
   * Main fetch handler for the Agent Durable Object
   */
   async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request);
  }
}