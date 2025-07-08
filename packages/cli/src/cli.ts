#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { ConfigManager } from "./config/config-manager.js";
import { PackageManager } from "./package/package-manager.js";
import { WranglerManager } from "./wrangler/wrangler-manager.js";
import { DryRunManager } from "./utils/dry-run.js";
import { CLIError } from "./utils/errors.js";
import { Logger } from "./utils/logger.js";
import type { MCPConfig, InstallOptions, ListOptions } from "./types/index.js";

const program = new Command();
const logger = new Logger();

interface GlobalOptions {
  dryRun?: boolean;
  verbose?: boolean;
  config?: string;
}

program
  .name("mcp-cli")
  .description("CLI tool for managing MCP servers with Cloudflare Workers")
  .version("1.0.0")
  .option("--dry-run", "Show what would be done without making changes")
  .option("-v, --verbose", "Enable verbose logging")
  .option("-c, --config <path>", "Path to config file", "mcp.jsonc");

program
  .command("install")
  .description("Install MCP servers from config file")
  .option("--skip-package-update", "Skip updating package.json dependencies")
  .option(
    "--skip-wrangler-update",
    "Skip updating wrangler.jsonc configuration",
  )
  .action(async (options: InstallOptions & GlobalOptions) => {
    const spinner = ora("Installing MCP servers...").start();

    try {
      const {
        dryRun,
        verbose,
        config: configPath,
      } = program.opts<GlobalOptions>();
      const dryRunManager = new DryRunManager(dryRun || false);

      if (verbose) logger.setVerbose(true);
      if (dryRun) logger.info(chalk.yellow("🔍 Running in dry-run mode"));

      const configManager = new ConfigManager(configPath || "mcp.jsonc");
      const config = await configManager.load();

      const packageManager = new PackageManager();
      const wranglerManager = new WranglerManager();

      await installServers(config, {
        dryRunManager,
        packageManager,
        wranglerManager,
        skipPackageUpdate: options.skipPackageUpdate ?? false,
        skipWranglerUpdate: options.skipWranglerUpdate ?? false,
        spinner,
      });

      spinner.succeed(chalk.green("✅ MCP servers installed successfully"));

      if (dryRun) {
        logger.info(chalk.yellow("\n📋 Dry run summary:"));
        dryRunManager.printSummary();
      }
    } catch (error) {
      spinner.fail(chalk.red("❌ Installation failed"));
      handleError(error);
    }
  });

program
  .command("list")
  .description("List currently installed MCP servers")
  .option("--format <type>", "Output format (table|json)", "table")
  .action(async (options: ListOptions & GlobalOptions) => {
    try {
      const { config: configPath } = program.opts<GlobalOptions>();
      const configManager = new ConfigManager(configPath || "mcp.jsonc");

      const servers = await listInstalledServers(
        configManager,
        options.format ?? "table",
      );
      console.log(servers);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command("validate")
  .description("Validate MCP configuration file")
  .action(async () => {
    try {
      const { config: configPath } = program.opts<GlobalOptions>();
      const configManager = new ConfigManager(configPath || "mcp.jsonc");

      const spinner = ora("Validating configuration...").start();
      await configManager.validate();
      spinner.succeed(chalk.green("✅ Configuration is valid"));
    } catch (error) {
      handleError(error);
    }
  });

program
  .command("init")
  .description("Initialize a new MCP configuration file")
  .option("--force", "Overwrite existing configuration file")
  .action(async (options: { force?: boolean } & GlobalOptions) => {
    try {
      const { config: configPath } = program.opts<GlobalOptions>();
      const configManager = new ConfigManager(configPath || "mcp.jsonc");

      await configManager.init(options.force);
      logger.info(
        chalk.green(
          `✅ Initialized MCP configuration at ${configPath || "mcp.jsonc"}`,
        ),
      );
    } catch (error) {
      handleError(error);
    }
  });

async function installServers(
  config: MCPConfig,
  context: {
    dryRunManager: DryRunManager;
    packageManager: PackageManager;
    wranglerManager: WranglerManager;
    skipPackageUpdate?: boolean;
    skipWranglerUpdate?: boolean;
    spinner: any;
  },
) {
  const {
    dryRunManager,
    packageManager,
    wranglerManager,
    skipPackageUpdate,
    skipWranglerUpdate,
    spinner,
  } = context;

  const serverNames = Object.keys(config.servers);
  logger.info(`Found ${serverNames.length} MCP servers to install`);

  // Install npm packages
  if (!skipPackageUpdate) {
    spinner.text = "Installing npm packages...";
    for (const [name, serverConfig] of Object.entries(config.servers)) {
      await dryRunManager.execute(
        `Install package ${serverConfig.source}`,
        () => packageManager.installPackage(serverConfig.source, name),
      );
    }
  }

  // Update wrangler configuration
  if (!skipWranglerUpdate) {
    spinner.text = "Updating Cloudflare Workers configuration...";
    await dryRunManager.execute(
      "Update wrangler.jsonc with MCP server bindings",
      () => wranglerManager.updateConfig(config),
    );
  }

  // Clean up servers not in config (PUT semantics)
  spinner.text = "Cleaning up removed servers...";
  await dryRunManager.execute(
    "Remove servers not in configuration",
    async () => {
      await packageManager.cleanupRemovedServers(serverNames);
      await wranglerManager.cleanupRemovedServers(serverNames);
    },
  );
}

async function listInstalledServers(
  configManager: ConfigManager,
  format: string,
): Promise<string> {
  const config = await configManager.load();
  const packageManager = new PackageManager();
  const wranglerManager = new WranglerManager();

  const installedPackages = await packageManager.getInstalledMCPPackages();
  const wranglerBindings = await wranglerManager.getMCPBindings();

  const servers = Object.entries(config.servers).map(
    ([name, serverConfig]) => ({
      name,
      source: serverConfig.source,
      command: serverConfig.command,
      packageInstalled: installedPackages.includes(name),
      wranglerConfigured: wranglerBindings.includes(name),
      status:
        installedPackages.includes(name) && wranglerBindings.includes(name)
          ? "installed"
          : "partial",
    }),
  );

  if (format === "json") {
    return JSON.stringify(servers, null, 2);
  }

  // Table format
  const table = servers
    .map(
      (server) =>
        `${server.status === "installed" ? "✅" : "! "} ${server.name.padEnd(20)} ${server.source.padEnd(40)} ${server.command}`,
    )
    .join("\n");

  return `${"Name".padEnd(22)} ${"Source".padEnd(42)} Command\n${"─".repeat(80)}\n${table}`;
}

function handleError(error: unknown): void {
  if (error instanceof CLIError) {
    logger.error(chalk.red(`❌ ${error.message}`));
    if (error.suggestion) {
      logger.info(chalk.yellow(`💡 ${error.suggestion}`));
    }
    process.exit(error.exitCode);
  } else {
    logger.error(
      chalk.red(
        `❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    process.exit(1);
  }
}

// Error handling for unhandled rejections
process.on("unhandledRejection", (reason) => {
  logger.error(`${chalk.red("Unhandled rejection:")}, ${reason}`);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error(`${chalk.red("Uncaught exception:")}, ${error}`);
  process.exit(1);
});

program.parse();
