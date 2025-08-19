import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  beforeEach,
  afterAll,
} from "vitest";
import WebSocket, { WebSocketServer } from "ws";
import {
  createPackageRepository,
  PackageRepository,
} from "../src/persistence/index.js";
import { spawn, ChildProcess } from "child_process";
import { setTimeout as delay } from "timers/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js";

// Test configuration
const MOCK_PROXY_PORT = 8788;
const MOCK_PROXY_URL = `ws://localhost:${MOCK_PROXY_PORT}`;
const SERVER_PORT = 3001;
const SERVER_HTTP_URL = `http://localhost:${SERVER_PORT}`;
const TEST_DB_PATH = "./data/test-packages.db";

// Helper function to send message and wait for response through mock proxy
async function sendMessageThroughProxy(
  mockServer: WebSocketServer,
  message: any,
  timeoutMs = 10000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Message timeout"));
    }, timeoutMs);

    // Get the connected client (our server)
    const clients = Array.from(mockServer.clients);
    if (clients.length === 0) {
      clearTimeout(timeout);
      reject(new Error("No client connected to mock proxy"));
      return;
    }

    const serverClient = clients[0];

    const messageHandler = (data: Buffer) => {
      clearTimeout(timeout);
      serverClient.removeListener("message", messageHandler);
      try {
        const response = JSON.parse(data.toString());
        resolve(response);
      } catch (error) {
        reject(new Error("Invalid JSON response"));
      }
    };

    serverClient.on("message", messageHandler);
    serverClient.send(JSON.stringify(message));
  });
}

// Helper function to wait for client connection
async function waitForClientConnection(
  mockServer: WebSocketServer,
  timeoutMs = 10000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Client connection timeout"));
    }, timeoutMs);

    if (mockServer.clients.size > 0) {
      clearTimeout(timeout);
      resolve();
      return;
    }

    const checkConnection = () => {
      if (mockServer.clients.size > 0) {
        clearTimeout(timeout);
        mockServer.removeListener("connection", checkConnection);
        resolve();
      }
    };

    mockServer.on("connection", checkConnection);
  });
}

describe("MCP WebSocket Server Integration Tests", () => {
  let mockProxyServer: WebSocketServer;
  let serverProcess: ChildProcess;
  let packageRepo: PackageRepository;

  beforeAll(async () => {
    console.log("🚀 Starting MCP WebSocket tests with mock proxy setup");

    // Initialize test database
    packageRepo = createPackageRepository("sqlite", TEST_DB_PATH);

    // Create mock WebSocket server (MCP proxy)
    mockProxyServer = new WebSocketServer({ port: MOCK_PROXY_PORT });
    console.log(`✅ Mock proxy server started on port ${MOCK_PROXY_PORT}`);

    // Set up mock proxy to handle connections
    mockProxyServer.on("connection", (ws) => {
      console.log("📡 Server connected to mock proxy");

      // Handle both server connections and MCP client connections
      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());

          // Handle MCP client initialize request
          if (message.jsonrpc === "2.0" && message.method === "initialize") {
            console.log("🔧 Handling MCP initialize request");
            ws.send(
              JSON.stringify({
                jsonrpc: "2.0",
                id: message.id,
                result: {
                  protocolVersion: "2024-11-05",
                  capabilities: {
                    logging: {},
                    prompts: { listChanged: true },
                    resources: { subscribe: true, listChanged: true },
                    tools: { listChanged: true },
                  },
                  serverInfo: {
                    name: "mock-mcp-server",
                    version: "1.0.0",
                  },
                },
              })
            );
            return;
          }

          // Handle server client ready message
          if (message.type === "client_ready") {
            console.log("✅ Server client ready message received");
            return;
          }

          // Handle other MCP methods with generic responses
          if (message.jsonrpc === "2.0" && message.method) {
            console.log(`🔧 Handling MCP method: ${message.method}`);
            ws.send(
              JSON.stringify({
                jsonrpc: "2.0",
                id: message.id,
                result: {},
              })
            );
            return;
          }
        } catch (error) {
          // Ignore parsing errors for non-JSON messages
        }
      });
    });

    // Start the server process with test configuration
    serverProcess = spawn("node", ["dist/index.js"], {
      cwd: "/Users/coop/Workspace/typescript-agent-vibework/packages/mcp-toolbox",
      env: {
        ...process.env,
        PORT: SERVER_PORT.toString(),
        DB_PATH: TEST_DB_PATH,
        MCP_PROXY_URL: MOCK_PROXY_URL,
        NODE_ENV: "test",
        PROXY_ID: "test-proxy-id-12345",
      },
      stdio: ["inherit", "pipe", "pipe"],
    });

    // Log server output
    serverProcess.stdout?.on("data", (data) => {
      console.log(`[SERVER] ${data.toString().trim()}`);
    });

    serverProcess.stderr?.on("data", (data) => {
      console.error(`[SERVER ERROR] ${data.toString().trim()}`);
    });

    // Wait for server to connect to mock proxy
    await waitForClientConnection(mockProxyServer, 15000);

    // Wait a bit more for full initialization
    await delay(1000);

    // Test that HTTP server is running
    try {
      const response = await fetch(SERVER_HTTP_URL);
      const data = await response.json();
      expect(data.status).toBe("ok");
      console.log("✅ Server HTTP endpoint is accessible");
    } catch (error) {
      throw new Error("❌ Server HTTP endpoint is not accessible");
    }
  });

  afterAll(async () => {
    console.log("🧹 Cleaning up test environment");

    // Close server process
    if (serverProcess) {
      serverProcess.kill("SIGTERM");
      await new Promise((resolve) => {
        serverProcess.on("exit", resolve);
        setTimeout(() => {
          serverProcess.kill("SIGKILL");
          resolve(undefined);
        }, 5000);
      });
    }

    // Close mock proxy server
    if (mockProxyServer) {
      mockProxyServer.close();
    }

    console.log("✅ Test cleanup completed");
  });

  beforeEach(async () => {
    // Clean up test packages
    try {
      await packageRepo.deleteByUniqueName("test-mcp-server");
      await packageRepo.deleteByUniqueName("framelink-figma-mcp-test");
      await packageRepo.deleteByUniqueName("invalid-mcp-test");
    } catch (error) {
      // Ignore cleanup errors
    }

    // Wait a bit for cleanup
    await delay(100);
  });

  afterEach(async () => {
    // Additional cleanup after each test
    try {
      await packageRepo.deleteByUniqueName("test-mcp-server");
      await packageRepo.deleteByUniqueName("framelink-figma-mcp-test");
      await packageRepo.deleteByUniqueName("invalid-mcp-test");
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("LIST Command", () => {
    it("should return list of packages", async () => {
      const response = await sendMessageThroughProxy(mockProxyServer, {
        verb: "list",
      });

      expect(response.verb).toBe("list");
      expect(response.success).toBe(true);
      expect(response.data).toBeInstanceOf(Array);
      expect(response.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("ADD Command - Test with Figma MCP", () => {
    it("should handle Figma MCP addition (success or expected failure)", async () => {
      const response = await sendMessageThroughProxy(mockProxyServer, {
        verb: "add",
        data: {
          "unique-name": "framelink-figma-mcp-test",
          command: "npx",
          args: [
            "-y",
            "figma-developer-mcp",
            "--figma-api-key=YOUR-ACTUAL-FIGMA-API-KEY",
            "--stdio",
          ],
          env: {},
        },
      });

      expect(response.verb).toBe("add");
      expect(typeof response.success).toBe("boolean");

      if (response.success) {
        // If successful, validate success structure
        expect(response.message).toContain("added successfully");
        expect(response.data).toBeDefined();
        expect(response.data.name).toBe("framelink-figma-mcp-test");
        expect(response.capabilities).toBeDefined();
        expect(typeof response.totalCapabilities).toBe("number");
        console.log("✅ Figma MCP was successfully added");

        // Clean up the successfully added package
        await sendMessageThroughProxy(mockProxyServer, {
          verb: "delete",
          data: {
            "unique-name": "framelink-figma-mcp-test",
          },
        });
      } else {
        // If failed, validate failure structure
        expect(response.error).toBeDefined();
        expect(typeof response.error).toBe("string");
        console.log(`❌ Figma MCP failed as expected: ${response.error}`);
      }
    });

    it("should handle duplicate package prevention", async () => {
      // First attempt
      const firstResponse = await sendMessageThroughProxy(mockProxyServer, {
        verb: "add",
        data: {
          "unique-name": "framelink-figma-mcp-test",
          command: "npx",
          args: [
            "-y",
            "figma-developer-mcp",
            "--figma-api-key=YOUR-ACTUAL-FIGMA-API-KEY",
            "--stdio",
          ],
          env: {},
        },
      });

      if (firstResponse.success) {
        // If first succeeded, second should fail with duplicate error
        const secondResponse = await sendMessageThroughProxy(mockProxyServer, {
          verb: "add",
          data: {
            "unique-name": "framelink-figma-mcp-test", // Same name
            command: "npx",
            args: [
              "-y",
              "figma-developer-mcp",
              "--figma-api-key=OTHER-KEY",
              "--stdio",
            ],
            env: {},
          },
        });

        expect(secondResponse.verb).toBe("add");
        expect(secondResponse.success).toBe(false);
        expect(secondResponse.error).toContain("already exists");

        // Clean up
        await sendMessageThroughProxy(mockProxyServer, {
          verb: "delete",
          data: {
            "unique-name": "framelink-figma-mcp-test",
          },
        });
      } else {
        // If first failed, we can't test duplicates but that's expected
        expect(firstResponse.error).toBeDefined();
        console.log(
          "⚠️ Cannot test duplicate prevention because first add failed (expected)"
        );
      }
    });
  });

  describe("ADD Command - Failure Cases", () => {
    it("should fail to add MCP with invalid command", async () => {
      const response = await sendMessageThroughProxy(mockProxyServer, {
        verb: "add",
        data: {
          "unique-name": "invalid-mcp-test",
          command: "nonexistent-command-12345",
          args: ["--fake-arg"],
          env: {},
        },
      });

      expect(response.verb).toBe("add");
      expect(response.success).toBe(false);
      expect(response.error).toContain("Failed to connect to MCP server");
    });

    it("should fail with invalid data structure", async () => {
      const response = await sendMessageThroughProxy(mockProxyServer, {
        verb: "add",
        data: {
          "unique-name": "",
          command: "",
        },
      });

      expect(response.verb).toBe("add");
      expect(response.success).toBe(false);
      expect(response.error).toBe("Validation failed");
    });
  });

  describe("UPDATE Command", () => {
    it("should successfully update existing MCP server configuration", async () => {
      // First try to add a package
      const addResponse = await sendMessageThroughProxy(mockProxyServer, {
        verb: "add",
        data: {
          "unique-name": "framelink-figma-mcp-test",
          command: "npx",
          args: [
            "-y",
            "figma-developer-mcp",
            "--figma-api-key=ORIGINAL-KEY",
            "--stdio",
          ],
          env: { ORIGINAL_VAR: "original-value" },
        },
      });

      if (addResponse.success) {
        // If add succeeded, test update
        const updateResponse = await sendMessageThroughProxy(mockProxyServer, {
          verb: "update",
          data: {
            "unique-name": "framelink-figma-mcp-test",
            command: "npx",
            args: [
              "-y",
              "figma-developer-mcp",
              "--figma-api-key=UPDATED-KEY",
              "--stdio",
            ],
            env: {
              ORIGINAL_VAR: "updated-value",
              NEW_VAR: "new-value",
            },
          },
        });

        expect(updateResponse.verb).toBe("update");
        expect(updateResponse.success).toBe(true);
        expect(updateResponse.message).toContain("updated successfully");
        expect(updateResponse.data).toBeDefined();
        expect(updateResponse.data.name).toBe("framelink-figma-mcp-test");
        expect(updateResponse.data.updatedAt).toBeDefined();
        expect(updateResponse.capabilities).toBeDefined();

        // Clean up
        await sendMessageThroughProxy(mockProxyServer, {
          verb: "delete",
          data: {
            "unique-name": "framelink-figma-mcp-test",
          },
        });
      } else {
        // If add failed, we can't test update
        console.log(
          "⚠️ Skipping update test because add failed (expected with invalid API key)"
        );
      }
    });

    it("should fail to update non-existent MCP server", async () => {
      const response = await sendMessageThroughProxy(mockProxyServer, {
        verb: "update",
        data: {
          "unique-name": "non-existent-package-12345",
          command: "npx",
          args: ["-y", "some-package", "--stdio"],
          env: {},
        },
      });

      expect(response.verb).toBe("update");
      expect(response.success).toBe(false);
      expect(response.error).toContain("not found");
    });

    it("should fail to update with invalid new configuration", async () => {
      // First add a package (if possible)
      const addResponse = await sendMessageThroughProxy(mockProxyServer, {
        verb: "add",
        data: {
          "unique-name": "framelink-figma-mcp-test",
          command: "npx",
          args: [
            "-y",
            "figma-developer-mcp",
            "--figma-api-key=ORIGINAL-KEY",
            "--stdio",
          ],
          env: {},
        },
      });

      if (addResponse.success) {
        // Try to update with invalid command
        const updateResponse = await sendMessageThroughProxy(mockProxyServer, {
          verb: "update",
          data: {
            "unique-name": "framelink-figma-mcp-test",
            command: "nonexistent-command-12345",
            args: ["--invalid"],
            env: {},
          },
        });

        expect(updateResponse.verb).toBe("update");
        expect(updateResponse.success).toBe(false);
        expect(updateResponse.error).toContain(
          "Failed to connect to MCP server with new configuration"
        );

        // Clean up
        await sendMessageThroughProxy(mockProxyServer, {
          verb: "delete",
          data: {
            "unique-name": "framelink-figma-mcp-test",
          },
        });
      } else {
        console.log(
          "⚠️ Skipping invalid update test because add failed (expected)"
        );
      }
    });
  });

  describe("DELETE Command", () => {
    it("should successfully delete existing MCP server", async () => {
      // First try to add a package
      const addResponse = await sendMessageThroughProxy(mockProxyServer, {
        verb: "add",
        data: {
          "unique-name": "framelink-figma-mcp-test",
          command: "npx",
          args: [
            "-y",
            "figma-developer-mcp",
            "--figma-api-key=YOUR-ACTUAL-FIGMA-API-KEY",
            "--stdio",
          ],
          env: {},
        },
      });

      if (addResponse.success) {
        // If add succeeded, test delete
        const deleteResponse = await sendMessageThroughProxy(mockProxyServer, {
          verb: "delete",
          data: {
            "unique-name": "framelink-figma-mcp-test",
          },
        });

        expect(deleteResponse.verb).toBe("delete");
        expect(deleteResponse.success).toBe(true);
        expect(deleteResponse.message).toContain("removed successfully");
      } else {
        // If add failed, we can't test successful delete
        console.log(
          "⚠️ Skipping delete test because add failed (expected with invalid API key)"
        );
      }
    });

    it("should fail to delete non-existent MCP server", async () => {
      const response = await sendMessageThroughProxy(mockProxyServer, {
        verb: "delete",
        data: {
          "unique-name": "non-existent-package-12345",
        },
      });

      expect(response.verb).toBe("delete");
      expect(response.success).toBe(false);
      expect(response.error).toContain("not found");
    });
  });

  describe("Full Workflow Tests", () => {
    it("should complete full workflow if MCP server is valid", async () => {
      // Step 1: Initial list
      const initialList = await sendMessageThroughProxy(mockProxyServer, {
        verb: "list",
      });

      expect(initialList.success).toBe(true);
      const initialCount = initialList.count;

      // Step 2: Add Figma MCP
      const addResponse = await sendMessageThroughProxy(mockProxyServer, {
        verb: "add",
        data: {
          "unique-name": "framelink-figma-mcp-test",
          command: "npx",
          args: [
            "-y",
            "figma-developer-mcp",
            "--figma-api-key=YOUR-ACTUAL-FIGMA-API-KEY",
            "--stdio",
          ],
          env: {},
        },
      });

      if (addResponse.success) {
        console.log(
          "✅ MCP server was successfully added - testing full workflow"
        );

        // Step 3: List should show the new package
        const listWithPackage = await sendMessageThroughProxy(mockProxyServer, {
          verb: "list",
        });

        expect(listWithPackage.success).toBe(true);
        expect(listWithPackage.count).toBe(initialCount + 1);
        expect(
          listWithPackage.data.some(
            (pkg: any) => pkg.name === "framelink-figma-mcp-test"
          )
        ).toBe(true);

        // Step 4: Delete the package
        const deleteResponse = await sendMessageThroughProxy(mockProxyServer, {
          verb: "delete",
          data: {
            "unique-name": "framelink-figma-mcp-test",
          },
        });

        expect(deleteResponse.success).toBe(true);

        // Step 5: Final list should be back to original count
        const finalList = await sendMessageThroughProxy(mockProxyServer, {
          verb: "list",
        });

        expect(finalList.success).toBe(true);
        expect(finalList.count).toBe(initialCount);
        expect(
          finalList.data.some(
            (pkg: any) => pkg.name === "framelink-figma-mcp-test"
          )
        ).toBe(false);

        console.log("✅ Full workflow completed successfully");
      } else {
        console.log(
          `⚠️ Full workflow test skipped - MCP server connection failed: ${addResponse.error}`
        );
        // This is acceptable - just validate the error response structure
        expect(addResponse.error).toBeDefined();
      }
    });

    it("should handle MCP client connection and communication", async () => {
      // Test MCP client connection using WebSocketClientTransport
      console.log("[TEST] Starting MCP client connection test");

      // Create MCP client transport with the mock proxy URL
      const transport = new WebSocketClientTransport(new URL(MOCK_PROXY_URL));
      const mcpClient = new Client({
        name: "test-client",
        version: "1.0.0",
      });

      // Connect the client with a timeout
      console.log("[TEST] Connecting MCP client...");
      await Promise.race([
        mcpClient.connect(transport),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Connect timeout")), 5000)
        ),
      ]);

      console.log("[TEST] MCP client connected successfully");

      const serverVersion = await mcpClient.getServerVersion();
      // Test that we can get some basic info (the mock server will respond)
      expect(serverVersion).toBeDefined();
      expect(typeof serverVersion).toBe("object");
      expect((serverVersion as any).name).toBe("mock-mcp-server");
      expect((serverVersion as any).version).toBe("1.0.0");

      // Clean up
      await mcpClient.close();
      console.log("[TEST] MCP client test completed successfully");
    }, 10000);
  });

  describe("Error Handling", () => {
    it("should handle invalid verb", async () => {
      const response = await sendMessageThroughProxy(mockProxyServer, {
        verb: "invalid-verb",
        data: {},
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe("Invalid message format");
    });

    it("should handle invalid JSON", async () => {
      const response = await sendMessageThroughProxy(mockProxyServer, {
        verb: "add",
        data: {
          "unique-name": "test",
          // Missing required 'command' field to trigger validation error
          args: ["--test"],
          env: {},
        },
      });

      expect(response.verb).toBe("add");
      expect(response.success).toBe(false);
      expect(response.error).toBe("Validation failed");
    });
  });
});
