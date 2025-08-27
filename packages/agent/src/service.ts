import { Hono } from 'hono';
import { AgentEnv } from './env';

export interface Service {
	/**
	 * Initialize the service while the agent is safely blocking concurrency
	 * This function is best for database migrations, etc.
	 */
	initialize?(): Promise<void>;

	/**
	 * The name of the service should be formated in @[org]/[repo]/[service-name] ie: @nullshot/agent/service-name
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

export interface Event {
	id: string;
	role: string;
	system?: string;
	content?: string;
}

export interface EventService extends Service {
	onEvent?: ((message: Event) => void) | undefined;
}
