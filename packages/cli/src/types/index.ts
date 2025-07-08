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
  [key: string]: any;
}

export interface DurableObjectBinding {
  name: string;
  class_name: string;
  script_name?: string;
}

export interface ServiceBinding {
  name: string;
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
  [key: string]: any;
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
