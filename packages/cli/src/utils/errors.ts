export class CLIError extends Error {
	constructor(
		message: string,
		public suggestion?: string,
		public exitCode: number = 1,
	) {
		super(message);
		this.name = "CLIError";
	}
}

export class ConfigError extends CLIError {
	constructor(message: string, suggestion?: string) {
		super(message, suggestion, 2);
		this.name = "ConfigError";
	}
}

export class ValidationError extends CLIError {
	constructor(message: string, suggestion?: string) {
		super(message, suggestion, 3);
		this.name = "ValidationError";
	}
}

