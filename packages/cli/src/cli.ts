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
  .name("nullshot")
  .description("Nullshot CLI for managing MCP servers with Cloudflare Workers")
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

program
  .command("run")
  .description("Run MCP servers with dedicated workers using service discovery")
  .option("--server <name>", "Run specific server by name")
  .option("--port <port>", "Port for local development", "8787")
  .option("--env <environment>", "Environment to run in", "development")
  .option("--watch", "Enable watch mode for development")
  .action(
    async (
      options: {
        server: string;
        port?: string;
        env?: string;
        watch?: boolean;
      } & GlobalOptions,
    ) => {
      const spinner = ora("Starting MCP servers...").start();

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

        const wranglerManager = new WranglerManager();

        await runServers(config, {
          dryRunManager,
          wranglerManager,
          serverName: options.server,
          port: options.port || "8787",
          environment: options.env || "development",
          watch: options.watch || false,
          spinner,
        });

        spinner.succeed(chalk.green("✅ MCP servers started successfully"));

        if (dryRun) {
          logger.info(chalk.yellow("\n📋 Dry run summary:"));
          dryRunManager.printSummary();
        }
      } catch (error) {
        spinner.fail(chalk.red("❌ Failed to start MCP servers"));
        handleError(error);
      }
    },
  );

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

async function runServers(
  config: MCPConfig,
  context: {
    dryRunManager: DryRunManager;
    wranglerManager: WranglerManager;
    serverName?: string;
    port: string;
    environment: string;
    watch: boolean;
    spinner: any;
  },
) {
  const {
    dryRunManager,
    wranglerManager,
    serverName,
    port,
    environment,
    watch,
    spinner,
  } = context;

  const serversToRun = serverName
    ? (config.servers[serverName] ? { [serverName]: config.servers[serverName] } : {})
    : config.servers;

  if (!serversToRun || Object.keys(serversToRun).length === 0) {
    throw new CLIError(
      "No MCP servers found to run",
      serverName
        ? `Server "${serverName}" not found in configuration`
        : "Add MCP servers to your mcp.jsonc configuration file",
      1,
    );
  }

  logger.info(`Starting ${Object.keys(serversToRun).length} MCP server(s)...`);

  // If no specific server is provided, run all servers in dedicated subprocesses
  if (!serverName) {
    spinner.text = "Starting all MCP servers in dedicated subprocesses...";
    
    // Update configuration for all servers
    await dryRunManager.execute(
      "Update wrangler.jsonc with configurations for all MCP servers",
      () => wranglerManager.updateConfigForDedicatedWorkers(config, serversToRun)
    );

    // Run all servers in parallel subprocesses
    const { spawn } = await import("node:child_process");
    const processes: any[] = [];

    for (const [serverName] of Object.entries(serversToRun)) {
      const serverPort = parseInt(port) + Object.keys(serversToRun).indexOf(serverName);
      const wranglerArgs = [
        "dev",
        "--port", serverPort.toString(),
        "--env", environment,
        "--name", serverName,
      ];

      if (watch) {
        wranglerArgs.push("--watch");
      }

      logger.info(chalk.blue(`🚀 Starting ${serverName} on port ${serverPort}...`));
      
      const childProcess = spawn("wrangler", wranglerArgs, {
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          MCP_SERVER_NAME: serverName,
          MCP_SERVER_PORT: serverPort.toString(),
        },
      });

      processes.push(childProcess);
    }

    // Handle graceful shutdown for all processes
    process.on("SIGINT", () => {
      logger.info(chalk.yellow("\n🛑 Shutting down all MCP servers..."));
      processes.forEach(p => p.kill("SIGINT"));
    });

    process.on("SIGTERM", () => {
      logger.info(chalk.yellow("\n🛑 Shutting down all MCP servers..."));
      processes.forEach(p => p.kill("SIGTERM"));
    });

    // Wait for all processes to exit
    await Promise.all(processes.map(p => 
      new Promise<void>((resolve, reject) => {
        p.on("close", (code: number) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new CLIError(
              `${serverName} process exited with code ${code}`,
              "Check the logs above for error details",
              code || 1
            ));
          }
        });

        p.on("error", (error: Error) => {
          reject(new CLIError(
            `Failed to start ${serverName}: ${error.message}`,
            "Make sure wrangler is installed and accessible in your PATH",
            1
          ));
        });
      })
    ));

    spinner.succeed(chalk.green("✅ All MCP servers started successfully"));
    return;
  }

  // Handle single server case
  spinner.text = "Configuring service bindings for dedicated workers...";
  await dryRunManager.execute(
    "Update wrangler.jsonc with service bindings for dedicated workers",
    () => wranglerManager.updateConfigForDedicatedWorkers(config, serversToRun)
  );

  // Start the single worker
  spinner.text = "Starting Cloudflare Worker...";
  
  const wranglerArgs = [
    "dev",
    "--port", port,
    "--env", environment,
    "--name", serverName,
  ];

  if (watch) {
    wranglerArgs.push("--watch");
  }

  logger.info(chalk.blue(`🚀 Starting ${serverName} on port ${port}...`));
  
  if (!dryRunManager.isEnabled()) {
    const { spawn } = await import("node:child_process");
    const wranglerProcess = spawn("wrangler", wranglerArgs, {
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        MCP_SERVER_NAME: serverName,
        MCP_SERVER_PORT: port,
      },
    });

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      logger.info(chalk.yellow(`\n🛑 Shutting down ${serverName}...`));
      wranglerProcess.kill("SIGINT");
    });

    process.on("SIGTERM", () => {
      logger.info(chalk.yellow(`\n🛑 Shutting down ${serverName}...`));
      wranglerProcess.kill("SIGTERM");
    });

    await new Promise<void>((resolve, reject) => {
      wranglerProcess.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new CLIError(
            `${serverName} process exited with code ${code}`,
            "Check the logs above for error details",
            code || 1
          ));
        }
      });

      wranglerProcess.on("error", (error) => {
        reject(new CLIError(
          `Failed to start wrangler: ${error.message}`,
          "Make sure wrangler is installed and accessible in your PATH",
          1
        ));
      });
    });
  }
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
