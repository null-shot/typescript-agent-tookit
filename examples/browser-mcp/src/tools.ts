import { Tool } from "@nullshot/mcp";
import { BrowserManager } from "./browser-manager.js";
import { BrowserRepository } from "./repository.js";
import {
  NavigationOptions,
  ScreenshotOptions,
  ExtractionOptions,
  InteractionOptions,
  WaitOptions,
  ScrapingResult,
  BrowserAction,
  SessionError,
  ExtractionError,
  NavigationError,
} from "./schema.js";

export function createBrowserTools(
  browserManager: BrowserManager,
  repository: BrowserRepository
): Tool[] {
  return [
    // Navigation tool
    {
      name: "navigate",
      description: "Navigate to a URL in a browser session",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The URL to navigate to",
          },
          sessionId: {
            type: "string",
            description: "Browser session ID (optional, will create new session if not provided)",
          },
          viewport: {
            type: "object",
            properties: {
              width: { type: "number", default: 1280 },
              height: { type: "number", default: 720 },
            },
            description: "Browser viewport size",
          },
          userAgent: {
            type: "string",
            description: "Custom user agent string",
          },
          waitUntil: {
            type: "string",
            enum: ["load", "domcontentloaded", "networkidle0", "networkidle2"],
            default: "networkidle2",
            description: "When to consider navigation complete",
          },
          timeout: {
            type: "number",
            default: 30000,
            description: "Navigation timeout in milliseconds",
          },
        },
        required: ["url"],
      },
      handler: async (args: NavigationOptions) => {
        try {
          const sessionId = args.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const startTime = Date.now();

          // Create or get session
          const page = await browserManager.getOrCreateSession(sessionId, args);
          
          // Navigate if URL is different from current
          const currentUrl = page.url();
          if (currentUrl !== args.url) {
            await browserManager.navigateSession(sessionId, args);
          }

          const loadTime = Date.now() - startTime;
          const title = await page.title();
          const finalUrl = page.url();

          // Save navigation result
          const result: ScrapingResult = {
            id: `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId,
            url: finalUrl,
            timestamp: new Date(),
            data: {
              navigated: true,
              requestedUrl: args.url,
              finalUrl,
              title,
            },
            metadata: {
              title,
              loadTime,
              statusCode: 200, // Puppeteer doesn't provide easy access to status code
            },
          };

          await repository.saveScrapingResult(result);

          return {
            success: true,
            sessionId,
            url: finalUrl,
            title,
            loadTime,
            message: `Successfully navigated to ${finalUrl}`,
          };
        } catch (error) {
          throw new NavigationError(
            `Navigation failed: ${error instanceof Error ? error.message : String(error)}`,
            args.url
          );
        }
      },
    },

    // Screenshot tool
    {
      name: "screenshot",
      description: "Take a screenshot of the current page or specific element",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Browser session ID",
          },
          url: {
            type: "string",
            description: "URL to navigate to before taking screenshot (optional if sessionId provided)",
          },
          selector: {
            type: "string",
            description: "CSS selector for specific element screenshot",
          },
          fullPage: {
            type: "boolean",
            default: false,
            description: "Take full page screenshot",
          },
          format: {
            type: "string",
            enum: ["png", "jpeg", "webp"],
            default: "png",
            description: "Screenshot format",
          },
          quality: {
            type: "number",
            minimum: 1,
            maximum: 100,
            description: "Screenshot quality (for jpeg/webp)",
          },
          width: {
            type: "number",
            description: "Screenshot width",
          },
          height: {
            type: "number",
            description: "Screenshot height",
          },
        },
      },
      handler: async (args: ScreenshotOptions) => {
        try {
          let page;
          let sessionId = args.sessionId;

          if (args.url && !sessionId) {
            // Create temporary session for URL
            sessionId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            page = await browserManager.createSession(sessionId, {
              url: args.url,
              viewport: args.width && args.height ? { width: args.width, height: args.height } : undefined,
            });
          } else if (sessionId) {
            page = await browserManager.getSession(sessionId);
            if (!page) {
              throw new SessionError(`Session ${sessionId} not found`, sessionId);
            }
            if (args.url) {
              await browserManager.navigateSession(sessionId, { url: args.url });
            }
          } else {
            throw new Error("Either sessionId or url must be provided");
          }

          // Take screenshot
          const screenshotOptions: any = {
            type: args.format || 'png',
            fullPage: args.fullPage || false,
            encoding: 'base64',
          };

          if (args.quality && (args.format === 'jpeg' || args.format === 'webp')) {
            screenshotOptions.quality = args.quality;
          }

          let screenshot: string;
          if (args.selector) {
            const element = await page.$(args.selector);
            if (!element) {
              throw new ExtractionError(`Element not found: ${args.selector}`, args.selector);
            }
            screenshot = await element.screenshot(screenshotOptions) as string;
          } else {
            screenshot = await page.screenshot(screenshotOptions) as string;
          }

          const title = await page.title();
          const currentUrl = page.url();

          // Save screenshot result
          const result: ScrapingResult = {
            id: `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId,
            url: currentUrl,
            timestamp: new Date(),
            data: {
              screenshot: true,
              format: args.format || 'png',
              fullPage: args.fullPage || false,
              selector: args.selector,
            },
            metadata: {
              title,
              loadTime: 0,
              statusCode: 200,
              screenshot: `data:image/${args.format || 'png'};base64,${screenshot}`,
            },
          };

          await repository.saveScrapingResult(result);

          return {
            success: true,
            sessionId,
            url: currentUrl,
            screenshot: `data:image/${args.format || 'png'};base64,${screenshot}`,
            format: args.format || 'png',
            size: screenshot.length,
            message: "Screenshot captured successfully",
          };
        } catch (error) {
          throw new Error(`Screenshot failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    },

    // Extract text tool
    {
      name: "extract_text",
      description: "Extract text content from the page using CSS selectors",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Browser session ID",
          },
          url: {
            type: "string",
            description: "URL to navigate to before extraction (optional if sessionId provided)",
          },
          selectors: {
            type: "object",
            description: "Object with keys as field names and values as CSS selectors",
            additionalProperties: {
              type: "string",
            },
          },
          selector: {
            type: "string",
            description: "Single CSS selector for simple extraction",
          },
          attribute: {
            type: "string",
            description: "HTML attribute to extract (default: textContent)",
          },
          multiple: {
            type: "boolean",
            default: false,
            description: "Extract multiple elements matching the selector",
          },
          waitForSelector: {
            type: "string",
            description: "Wait for this selector before extraction",
          },
          timeout: {
            type: "number",
            default: 5000,
            description: "Timeout for waiting for selectors",
          },
        },
      },
      handler: async (args: ExtractionOptions) => {
        try {
          let page;
          let sessionId = args.sessionId;

          if (args.url && !sessionId) {
            sessionId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            page = await browserManager.createSession(sessionId, { url: args.url });
          } else if (sessionId) {
            page = await browserManager.getSession(sessionId);
            if (!page) {
              throw new SessionError(`Session ${sessionId} not found`, sessionId);
            }
            if (args.url) {
              await browserManager.navigateSession(sessionId, { url: args.url });
            }
          } else {
            throw new Error("Either sessionId or url must be provided");
          }

          // Wait for selector if specified
          if (args.waitForSelector) {
            await page.waitForSelector(args.waitForSelector, { timeout: args.timeout });
          }

          let extractedData: any = {};
          const currentUrl = page.url();
          const title = await page.title();

          if (args.selectors) {
            // Extract multiple fields
            for (const [fieldName, selector] of Object.entries(args.selectors)) {
              try {
                if (args.multiple) {
                  extractedData[fieldName] = await page.$$eval(
                    selector,
                    (elements, attr) => elements.map(el => 
                      attr ? el.getAttribute(attr) : el.textContent?.trim()
                    ).filter(Boolean),
                    args.attribute
                  );
                } else {
                  extractedData[fieldName] = await page.$eval(
                    selector,
                    (element, attr) => attr ? element.getAttribute(attr) : element.textContent?.trim(),
                    args.attribute
                  );
                }
              } catch (error) {
                console.warn(`Failed to extract ${fieldName} with selector ${selector}:`, error);
                extractedData[fieldName] = null;
              }
            }
          } else if (args.selector) {
            // Extract single field
            try {
              if (args.multiple) {
                extractedData = await page.$$eval(
                  args.selector,
                  (elements, attr) => elements.map(el => 
                    attr ? el.getAttribute(attr) : el.textContent?.trim()
                  ).filter(Boolean),
                  args.attribute
                );
              } else {
                extractedData = await page.$eval(
                  args.selector,
                  (element, attr) => attr ? element.getAttribute(attr) : element.textContent?.trim(),
                  args.attribute
                );
              }
            } catch (error) {
              throw new ExtractionError(`Failed to extract with selector ${args.selector}`, args.selector);
            }
          } else {
            // Extract full page text
            extractedData = await page.evaluate(() => document.body.textContent?.trim());
          }

          // Save extraction result
          const result: ScrapingResult = {
            id: `extract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId,
            url: currentUrl,
            timestamp: new Date(),
            data: extractedData,
            metadata: {
              title,
              loadTime: 0,
              statusCode: 200,
            },
          };

          await repository.saveScrapingResult(result);

          return {
            success: true,
            sessionId,
            url: currentUrl,
            data: extractedData,
            message: "Text extraction completed successfully",
          };
        } catch (error) {
          throw new ExtractionError(
            `Text extraction failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      },
    },

    // Extract links tool
    {
      name: "extract_links",
      description: "Extract all links from the page with optional filtering",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Browser session ID",
          },
          url: {
            type: "string",
            description: "URL to navigate to before extraction (optional if sessionId provided)",
          },
          filter: {
            type: "string",
            description: "Filter links by text content or href pattern",
          },
          internal: {
            type: "boolean",
            description: "Only extract internal links (same domain)",
          },
          external: {
            type: "boolean",
            description: "Only extract external links (different domain)",
          },
        },
      },
      handler: async (args: ExtractionOptions) => {
        try {
          let page;
          let sessionId = args.sessionId;

          if (args.url && !sessionId) {
            sessionId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            page = await browserManager.createSession(sessionId, { url: args.url });
          } else if (sessionId) {
            page = await browserManager.getSession(sessionId);
            if (!page) {
              throw new SessionError(`Session ${sessionId} not found`, sessionId);
            }
            if (args.url) {
              await browserManager.navigateSession(sessionId, { url: args.url });
            }
          } else {
            throw new Error("Either sessionId or url must be provided");
          }

          const currentUrl = page.url();
          const currentDomain = new URL(currentUrl).hostname;
          const title = await page.title();

          // Extract all links
          const links = await page.evaluate((filter: string | undefined, internal: boolean | undefined, external: boolean | undefined, currentDomain: string) => {
            const linkElements = Array.from(document.querySelectorAll('a[href]'));
            
            return linkElements
              .map(link => {
                const href = link.getAttribute('href');
                const text = link.textContent?.trim();
                
                if (!href) return null;
                
                let fullUrl: string;
                try {
                  fullUrl = new URL(href, window.location.href).href;
                } catch {
                  return null;
                }
                
                const linkDomain = new URL(fullUrl).hostname;
                const isInternal = linkDomain === currentDomain;
                
                // Apply filters
                if (internal && !isInternal) return null;
                if (external && isInternal) return null;
                if (filter && text && !text.toLowerCase().includes(filter.toLowerCase()) && 
                    !fullUrl.toLowerCase().includes(filter.toLowerCase())) return null;
                
                return {
                  url: fullUrl,
                  text: text || '',
                  internal: isInternal,
                  domain: linkDomain,
                };
              })
              .filter(Boolean);
          }, args.filter, args.internal, args.external, currentDomain);

          // Save extraction result
          const result: ScrapingResult = {
            id: `links_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId,
            url: currentUrl,
            timestamp: new Date(),
            data: { links, count: links.length },
            metadata: {
              title,
              loadTime: 0,
              statusCode: 200,
            },
          };

          await repository.saveScrapingResult(result);

          return {
            success: true,
            sessionId,
            url: currentUrl,
            links,
            count: links.length,
            message: `Extracted ${links.length} links successfully`,
          };
        } catch (error) {
          throw new ExtractionError(
            `Link extraction failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      },
    },

    // Interact tool
    {
      name: "interact",
      description: "Interact with page elements (click, fill forms, etc.)",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Browser session ID",
          },
          url: {
            type: "string",
            description: "URL to navigate to before interaction (optional if sessionId provided)",
          },
          actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["click", "fill", "select", "hover", "scroll", "wait", "evaluate"],
                  description: "Type of action to perform",
                },
                selector: {
                  type: "string",
                  description: "CSS selector for the element",
                },
                value: {
                  type: "string",
                  description: "Value for fill/select actions or JavaScript code for evaluate",
                },
                options: {
                  type: "object",
                  description: "Additional options for the action",
                },
                timeout: {
                  type: "number",
                  default: 5000,
                  description: "Timeout for this action",
                },
              },
              required: ["type"],
            },
            description: "Array of actions to perform",
          },
          waitBetweenActions: {
            type: "number",
            default: 1000,
            description: "Wait time between actions in milliseconds",
          },
        },
        required: ["actions"],
      },
      handler: async (args: InteractionOptions) => {
        try {
          let page;
          let sessionId = args.sessionId;

          if (args.url && !sessionId) {
            sessionId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            page = await browserManager.createSession(sessionId, { url: args.url });
          } else if (sessionId) {
            page = await browserManager.getSession(sessionId);
            if (!page) {
              throw new SessionError(`Session ${sessionId} not found`, sessionId);
            }
            if (args.url) {
              await browserManager.navigateSession(sessionId, { url: args.url });
            }
          } else {
            throw new Error("Either sessionId or url must be provided");
          }

          const results: any[] = [];
          const currentUrl = page.url();

          for (let i = 0; i < args.actions.length; i++) {
            const action = args.actions[i];
            
            try {
              switch (action.type) {
                case 'click':
                  if (!action.selector) throw new Error('Selector required for click action');
                  await page.waitForSelector(action.selector, { timeout: action.timeout });
                  await page.click(action.selector);
                  results.push({ action: i, type: 'click', success: true, selector: action.selector });
                  break;

                case 'fill':
                  if (!action.selector || !action.value) throw new Error('Selector and value required for fill action');
                  await page.waitForSelector(action.selector, { timeout: action.timeout });
                  await page.fill(action.selector, action.value);
                  results.push({ action: i, type: 'fill', success: true, selector: action.selector, value: action.value });
                  break;

                case 'select':
                  if (!action.selector || !action.value) throw new Error('Selector and value required for select action');
                  await page.waitForSelector(action.selector, { timeout: action.timeout });
                  await page.selectOption(action.selector, action.value);
                  results.push({ action: i, type: 'select', success: true, selector: action.selector, value: action.value });
                  break;

                case 'hover':
                  if (!action.selector) throw new Error('Selector required for hover action');
                  await page.waitForSelector(action.selector, { timeout: action.timeout });
                  await page.hover(action.selector);
                  results.push({ action: i, type: 'hover', success: true, selector: action.selector });
                  break;

                case 'scroll':
                  if (action.selector) {
                    await page.waitForSelector(action.selector, { timeout: action.timeout });
                    const element = await page.$(action.selector);
                    if (element) {
                      await element.scrollIntoView();
                    }
                  } else {
                    const scrollOptions = action.options || { top: 0, left: 0 };
                    await page.evaluate((opts) => window.scrollTo(opts), scrollOptions);
                  }
                  results.push({ action: i, type: 'scroll', success: true, selector: action.selector });
                  break;

                case 'wait':
                  const waitTime = action.options?.time || 1000;
                  if (action.selector) {
                    await page.waitForSelector(action.selector, { timeout: action.timeout });
                  } else {
                    await page.waitForTimeout(waitTime);
                  }
                  results.push({ action: i, type: 'wait', success: true, time: waitTime });
                  break;

                case 'evaluate':
                  if (!action.value) throw new Error('JavaScript code required for evaluate action');
                  const evalResult = await page.evaluate(action.value);
                  results.push({ action: i, type: 'evaluate', success: true, result: evalResult });
                  break;

                default:
                  throw new Error(`Unknown action type: ${action.type}`);
              }

              // Wait between actions
              if (i < args.actions.length - 1 && args.waitBetweenActions) {
                await page.waitForTimeout(args.waitBetweenActions);
              }
            } catch (error) {
              results.push({ 
                action: i, 
                type: action.type, 
                success: false, 
                error: error instanceof Error ? error.message : String(error),
                selector: action.selector 
              });
            }
          }

          const title = await page.title();
          const finalUrl = page.url();

          // Save interaction result
          const result: ScrapingResult = {
            id: `interact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId,
            url: finalUrl,
            timestamp: new Date(),
            data: { actions: results, totalActions: args.actions.length },
            metadata: {
              title,
              loadTime: 0,
              statusCode: 200,
            },
          };

          await repository.saveScrapingResult(result);

          const successCount = results.filter(r => r.success).length;

          return {
            success: successCount === args.actions.length,
            sessionId,
            url: finalUrl,
            results,
            successCount,
            totalActions: args.actions.length,
            message: `Completed ${successCount}/${args.actions.length} actions successfully`,
          };
        } catch (error) {
          throw new Error(`Interaction failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    },

    // Wait for condition tool
    {
      name: "wait_for",
      description: "Wait for specific conditions on the page",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Browser session ID",
          },
          url: {
            type: "string",
            description: "URL to navigate to before waiting (optional if sessionId provided)",
          },
          condition: {
            type: "string",
            enum: ["element", "network", "timeout", "function"],
            description: "Type of condition to wait for",
          },
          selector: {
            type: "string",
            description: "CSS selector to wait for (required for element condition)",
          },
          timeout: {
            type: "number",
            default: 30000,
            description: "Maximum wait time in milliseconds",
          },
          networkIdleTimeout: {
            type: "number",
            default: 500,
            description: "Network idle timeout for network condition",
          },
          customFunction: {
            type: "string",
            description: "JavaScript function to evaluate (required for function condition)",
          },
        },
        required: ["condition"],
      },
      handler: async (args: WaitOptions) => {
        try {
          let page;
          let sessionId = args.sessionId;

          if (args.url && !sessionId) {
            sessionId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            page = await browserManager.createSession(sessionId, { url: args.url });
          } else if (sessionId) {
            page = await browserManager.getSession(sessionId);
            if (!page) {
              throw new SessionError(`Session ${sessionId} not found`, sessionId);
            }
            if (args.url) {
              await browserManager.navigateSession(sessionId, { url: args.url });
            }
          } else {
            throw new Error("Either sessionId or url must be provided");
          }

          const startTime = Date.now();
          let result: any = {};

          switch (args.condition) {
            case 'element':
              if (!args.selector) throw new Error('Selector required for element condition');
              await page.waitForSelector(args.selector, { timeout: args.timeout });
              result = { condition: 'element', selector: args.selector, found: true };
              break;

            case 'network':
              await page.waitForLoadState('networkidle', { timeout: args.timeout });
              result = { condition: 'network', networkIdle: true };
              break;

            case 'timeout':
              await page.waitForTimeout(args.timeout || 5000);
              result = { condition: 'timeout', waited: args.timeout || 5000 };
              break;

            case 'function':
              if (!args.customFunction) throw new Error('Custom function required for function condition');
              await page.waitForFunction(args.customFunction, { timeout: args.timeout });
              result = { condition: 'function', function: args.customFunction, satisfied: true };
              break;

            default:
              throw new Error(`Unknown condition: ${args.condition}`);
          }

          const waitTime = Date.now() - startTime;
          const currentUrl = page.url();
          const title = await page.title();

          // Save wait result
          const waitResult: ScrapingResult = {
            id: `wait_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId,
            url: currentUrl,
            timestamp: new Date(),
            data: { ...result, waitTime },
            metadata: {
              title,
              loadTime: waitTime,
              statusCode: 200,
            },
          };

          await repository.saveScrapingResult(waitResult);

          return {
            success: true,
            sessionId,
            url: currentUrl,
            waitTime,
            ...result,
            message: `Wait condition satisfied in ${waitTime}ms`,
          };
        } catch (error) {
          throw new Error(`Wait condition failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    },

    // Evaluate JavaScript tool
    {
      name: "evaluate_js",
      description: "Execute custom JavaScript code in the browser context",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Browser session ID",
          },
          url: {
            type: "string",
            description: "URL to navigate to before evaluation (optional if sessionId provided)",
          },
          code: {
            type: "string",
            description: "JavaScript code to execute",
          },
          args: {
            type: "array",
            description: "Arguments to pass to the JavaScript function",
          },
        },
        required: ["code"],
      },
      handler: async (args: { sessionId?: string; url?: string; code: string; args?: any[] }) => {
        try {
          let page;
          let sessionId = args.sessionId;

          if (args.url && !sessionId) {
            sessionId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            page = await browserManager.createSession(sessionId, { url: args.url });
          } else if (sessionId) {
            page = await browserManager.getSession(sessionId);
            if (!page) {
              throw new SessionError(`Session ${sessionId} not found`, sessionId);
            }
            if (args.url) {
              await browserManager.navigateSession(sessionId, { url: args.url });
            }
          } else {
            throw new Error("Either sessionId or url must be provided");
          }

          // Execute JavaScript code
          const evalResult = await page.evaluate(args.code, ...(args.args || []));
          
          const currentUrl = page.url();
          const title = await page.title();

          // Save evaluation result
          const result: ScrapingResult = {
            id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId,
            url: currentUrl,
            timestamp: new Date(),
            data: { code: args.code, result: evalResult, args: args.args },
            metadata: {
              title,
              loadTime: 0,
              statusCode: 200,
            },
          };

          await repository.saveScrapingResult(result);

          return {
            success: true,
            sessionId,
            url: currentUrl,
            result: evalResult,
            message: "JavaScript evaluation completed successfully",
          };
        } catch (error) {
          throw new Error(`JavaScript evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    },

    // Close session tool
    {
      name: "close_session",
      description: "Close a browser session",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Browser session ID to close",
          },
        },
        required: ["sessionId"],
      },
      handler: async (args: { sessionId: string }) => {
        try {
          await browserManager.closeSession(args.sessionId);
          
          return {
            success: true,
            sessionId: args.sessionId,
            message: `Session ${args.sessionId} closed successfully`,
          };
        } catch (error) {
          throw new SessionError(
            `Failed to close session: ${error instanceof Error ? error.message : String(error)}`,
            args.sessionId
          );
        }
      },
    },
  ];
}
