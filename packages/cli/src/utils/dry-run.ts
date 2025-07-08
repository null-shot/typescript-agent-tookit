import chalk from "chalk";

export class DryRunManager {
	private operations: string[] = [];

	constructor(private enabled: boolean) {}

	async execute<T>(
		description: string,
		action: () => Promise<T>,
	): Promise<T | void> {
		if (this.enabled) {
			this.operations.push(description);
			console.log(chalk.blue(`[DRY RUN] ${description}`));
			return;
		}

		return await action();
	}

	printSummary(): void {
		if (this.operations.length === 0) {
			console.log(chalk.gray("No operations would be performed."));
			return;
		}

		console.log(chalk.blue("Operations that would be performed:"));
		this.operations.forEach((op, index) => {
			console.log(chalk.blue(`  ${index + 1}. ${op}`));
		});
	}

	getOperations(): string[] {
		return [...this.operations];
	}

	isEnabled(): boolean {
		return this.enabled;
	}
}

