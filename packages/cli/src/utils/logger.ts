import chalk from "chalk";

export class Logger {
	private verbose = false;

	setVerbose(verbose: boolean): void {
		this.verbose = verbose;
	}

	info(message: string): void {
		console.log(message);
	}

	warn(message: string): void {
		console.warn(chalk.yellow(`!  ${message}`));
	}

	error(message: string): void {
		console.error(chalk.red(`❌ ${message}`));
	}

	debug(message: string): void {
		if (this.verbose) {
			console.log(chalk.gray(`🔍 ${message}`));
		}
	}

	success(message: string): void {
		console.log(chalk.green(`✅ ${message}`));
	}
}

