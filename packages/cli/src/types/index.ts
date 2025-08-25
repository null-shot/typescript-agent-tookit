export interface MCPConfig {
  servers: Record<string, MCPServerConfig>;
}

export interface MCPServerConfig {
  source: string;
  command: string;
  type?: "worker" | "do";
  env?: EnvironmentVariable[];
  auth?: AuthConfig;
}

export interface EnvironmentVariable {
  name: string;
  value?: string;
}

export interface AuthConfig {
  headers?: Record<string, string>;
}

export interface InstallOptions {
  skipPackageUpdate?: boolean;
  skipWranglerUpdate?: boolean;
}

export interface ListOptions {
  format?: "table" | "json";
}

export interface WranglerConfig {
  name?: string;
  compatibility_date?: string;
  compatibility_flags?: string[];
  durable_objects?: {
    bindings?: DurableObjectBinding[];
  };
  services?: ServiceBinding[];
  vars?: Record<string, string>;
  migrations?: MigrationConfig[];
  [key: string]: any;
}

export interface MigrationConfig {
  tag: string;
  new_classes?: string[];
  renamed_classes?: Array<{ from: string; to: string }>;
  deleted_classes?: string[];
  new_sqlite_classes?: string[];
}

export interface DurableObjectBinding {
  name: string;
  class_name: string;
  script_name?: string;
}

export interface ServiceBinding {
  binding: string;
  service: string;
  environment?: string;
}

export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  packageManager?: string;
  mcpServers?: Record<string, MCPServerMetadata>;
  [key: string]: any;
}

export interface MCPServerMetadata {
  source: string;
  installedAt: string;
  packageName: string;
  wranglerConfig?: WranglerConfig;
  wranglerConfigPath?: string;
  hasWranglerConfig?: boolean;
  serviceName?: string;
  dependencyPath?: string;
  d1Databases?: string[];
}

export interface PackageManagerInfo {
  name: "npm" | "yarn" | "pnpm";
  installCommand: string;
  removeCommand: string;
  listCommand: string;
}

export interface DryRunOperation {
  description: string;
  action: () => Promise<void>;
}

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface DependencyAnalysisResult {
  serviceName?: string;
  wranglerConfigPath?: string;
  wranglerConfig?: WranglerConfig;
  hasWranglerConfig: boolean;
  d1Databases?: string[];
}
