import { Hono } from 'hono';
import { AgentEnv } from './env';
import { LanguageModelV1Middleware } from 'ai';

export interface Service {
  /**
   * Initialize the service while the agent is safely blocking concurrency
   * This function is best for database migrations, etc.
   */
  initialize?(): Promise<void>;

  /**
   * The name of the service should be formated in @[org]/[repo]/[service-name] ie: @xava-labs/agent/service-name
   */ 
  name: string;
}

/**
 * Interface for services that need to register routes with Hono
 */
export interface ExternalService extends Service {
  /**
   * Register routes with the Hono app
   * @param app The Hono app to register routes with
   */
  registerRoutes<E extends AgentEnv>(app: Hono<{ Bindings: E }>): void;
}

export function isExternalService(service: Service): service is ExternalService {
  return 'registerRoutes' in service && typeof service.registerRoutes === 'function';
}

export interface MiddlewareService extends Service, LanguageModelV1Middleware {}

export function isMiddlewareService(service: Service): service is MiddlewareService {
  return (
    ('middlewareVersion' in service && typeof service.middlewareVersion === 'string') ||
    ('transformParams' in service && typeof service.transformParams === 'function') ||
    ('wrapGenerate' in service && typeof service.wrapGenerate === 'function') ||
    ('wrapStream' in service && typeof service.wrapStream === 'function')
  );
}

export interface Event {
  id: string;
  system?: string;
  CoreMessage?: string;
}

export interface EventService extends Service {
  onevent?: ((message: Event) => void) | undefined;
}