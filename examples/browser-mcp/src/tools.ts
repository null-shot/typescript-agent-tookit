import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BrowserManager } from "./browser-manager.js";
import { BrowserRepository } from "./repository.js";
import {
  NavigationOptions,
  ScreenshotOptions,
  ExtractionOptions,
  InteractionOptions,
  WaitOptions,
  ScrapingResult,
  SessionError,
  ExtractionError,
  NavigationError,
} from "./schema.js";

export function setupBrowserTools(
  server: McpServer,
  browserManager: BrowserManager,
  repository: BrowserRepository
): void {
  // Navigation tool
  server.tool(
    "navigate",
    "Navigate to a URL in a browser session",
    {
      url: z.string().describe("The URL to navigate to"),
      sessionId: z.string().optional().describe("Browser session ID (optional, will create new session if not provided)"),
      viewport: z.object({
        width: z.number().default(1280),
        height: z.number().default(720),
      }).optional().describe("Browser viewport size"),
      userAgent: z.string().optional().describe("Custom user agent string"),
      waitUntil: z.enum(["load", "domcontentloaded", "networkidle0", "networkidle2"]).default("networkidle2").describe("When to consider navigation complete"),
      timeout: z.number().default(30000).describe("Navigation timeout in milliseconds"),
    },
    async (args: NavigationOptions) => {
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
        const scrapingResult: ScrapingResult = {
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
            statusCode: 200,
          },
        };

        await repository.saveScrapingResult(scrapingResult);

        return {
          content: [{
            type: "text",
            text: `Successfully navigated to ${finalUrl}`
          }],
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
    }
  );

  // Screenshot tool
  server.tool(
    "screenshot",
    "Take a screenshot of the current page or specific element",
    {
      sessionId: z.string().optional().describe("Browser session ID"),
      url: z.string().optional().describe("URL to navigate to before taking screenshot (optional if sessionId provided)"),
      selector: z.string().optional().describe("CSS selector for specific element screenshot"),
      fullPage: z.boolean().default(false).describe("Take full page screenshot"),
      format: z.enum(["png", "jpeg", "webp"]).default("png").describe("Screenshot format"),
      quality: z.number().min(1).max(100).optional().describe("Screenshot quality (for jpeg/webp)"),
      width: z.number().optional().describe("Screenshot width"),
      height: z.number().optional().describe("Screenshot height"),
    },
    async (args: ScreenshotOptions) => {
      try {
        let page;
        let sessionId = args.sessionId;

        if (args.url && !sessionId) {
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
        const scrapingResult: ScrapingResult = {
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

        await repository.saveScrapingResult(scrapingResult);

        return {
          content: [{
            type: "text",
            text: "Screenshot captured successfully"
          }],
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
    }
  );

  // Extract text tool
  server.tool(
    "extract_text",
    "Extract text content from the page using CSS selectors",
    {
      sessionId: z.string().optional().describe("Browser session ID"),
      url: z.string().optional().describe("URL to navigate to before extraction (optional if sessionId provided)"),
      selectors: z.record(z.string()).optional().describe("Object with keys as field names and values as CSS selectors"),
      selector: z.string().optional().describe("Single CSS selector for simple extraction"),
      attribute: z.string().optional().describe("HTML attribute to extract (default: textContent)"),
      multiple: z.boolean().default(false).describe("Extract multiple elements matching the selector"),
      waitForSelector: z.string().optional().describe("Wait for this selector before extraction"),
      timeout: z.number().default(5000).describe("Timeout for waiting for selectors"),
    },
    async (args: ExtractionOptions) => {
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
        const scrapingResult: ScrapingResult = {
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

        await repository.saveScrapingResult(scrapingResult);

        return {
          content: [{
            type: "text",
            text: "Text extraction completed successfully"
          }],
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
    }
  );

  // Extract links tool
  server.tool(
    "extract_links",
    "Extract all links from the page with optional filtering",
    {
      sessionId: z.string().optional().describe("Browser session ID"),
      url: z.string().optional().describe("URL to navigate to before extraction (optional if sessionId provided)"),
      filter: z.string().optional().describe("Filter links by text content or href pattern"),
      internal: z.boolean().optional().describe("Only extract internal links (same domain)"),
      external: z.boolean().optional().describe("Only extract external links (different domain)"),
    },
    async (args: ExtractionOptions) => {
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
        const scrapingResult: ScrapingResult = {
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

        await repository.saveScrapingResult(scrapingResult);

        return {
          content: [{
            type: "text",
            text: `Extracted ${links.length} links successfully`
          }],
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
    }
  );

  // Interact tool
  server.tool(
    "interact",
    "Interact with page elements (click, fill forms, etc.)",
    {
      sessionId: z.string().optional().describe("Browser session ID"),
      url: z.string().optional().describe("URL to navigate to before interaction (optional if sessionId provided)"),
      actions: z.array(z.object({
        type: z.enum(["click", "fill", "select", "hover", "scroll", "wait", "evaluate"]).describe("Type of action to perform"),
        selector: z.string().optional().describe("CSS selector for the element"),
        value: z.string().optional().describe("Value for fill/select actions or JavaScript code for evaluate"),
        options: z.record(z.any()).optional().describe("Additional options for the action"),
        timeout: z.number().default(5000).describe("Timeout for this action"),
      })).describe("Array of actions to perform"),
      waitBetweenActions: z.number().default(1000).describe("Wait time between actions in milliseconds"),
    },
    async (args: InteractionOptions) => {
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
        const successCount = results.filter(r => r.success).length;

        return {
          content: [{
            type: "text",
            text: `Completed ${successCount}/${args.actions.length} actions successfully`
          }],
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
    }
  );

  // Wait for condition tool
  server.tool(
    "wait_for",
    "Wait for specific conditions on the page",
    {
      sessionId: z.string().optional().describe("Browser session ID"),
      url: z.string().optional().describe("URL to navigate to before waiting (optional if sessionId provided)"),
      condition: z.enum(["element", "network", "timeout", "function"]).describe("Type of condition to wait for"),
      selector: z.string().optional().describe("CSS selector to wait for (required for element condition)"),
      timeout: z.number().default(30000).describe("Maximum wait time in milliseconds"),
      networkIdleTimeout: z.number().default(500).describe("Network idle timeout for network condition"),
      customFunction: z.string().optional().describe("JavaScript function to evaluate (required for function condition)"),
    },
    async (args: WaitOptions) => {
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
        let conditionResult: any = {};

        switch (args.condition) {
          case 'element':
            if (!args.selector) throw new Error('Selector required for element condition');
            await page.waitForSelector(args.selector, { timeout: args.timeout });
            conditionResult = { condition: 'element', selector: args.selector, found: true };
            break;

          case 'network':
            await page.waitForLoadState('networkidle', { timeout: args.timeout });
            conditionResult = { condition: 'network', networkIdle: true };
            break;

          case 'timeout':
            await page.waitForTimeout(args.timeout || 5000);
            conditionResult = { condition: 'timeout', waited: args.timeout || 5000 };
            break;

          case 'function':
            if (!args.customFunction) throw new Error('Custom function required for function condition');
            await page.waitForFunction(args.customFunction, { timeout: args.timeout });
            conditionResult = { condition: 'function', function: args.customFunction, satisfied: true };
            break;

          default:
            throw new Error(`Unknown condition: ${args.condition}`);
        }

        const waitTime = Date.now() - startTime;
        const currentUrl = page.url();

        return {
          content: [{
            type: "text",
            text: `Wait condition satisfied in ${waitTime}ms`
          }],
          success: true,
          sessionId,
          url: currentUrl,
          waitTime,
          ...conditionResult,
          message: `Wait condition satisfied in ${waitTime}ms`,
        };
      } catch (error) {
        throw new Error(`Wait condition failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Evaluate JavaScript tool
  server.tool(
    "evaluate_js",
    "Execute custom JavaScript code in the browser context",
    {
      sessionId: z.string().optional().describe("Browser session ID"),
      url: z.string().optional().describe("URL to navigate to before evaluation (optional if sessionId provided)"),
      code: z.string().describe("JavaScript code to execute"),
      args: z.array(z.any()).optional().describe("Arguments to pass to the JavaScript function"),
    },
    async (args: { sessionId?: string; url?: string; code: string; args?: any[] }) => {
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

        return {
          content: [{
            type: "text",
            text: "JavaScript evaluation completed successfully"
          }],
          success: true,
          sessionId,
          url: currentUrl,
          result: evalResult,
          message: "JavaScript evaluation completed successfully",
        };
      } catch (error) {
        throw new Error(`JavaScript evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Close session tool
  server.tool(
    "close_session",
    "Close a browser session",
    {
      sessionId: z.string().describe("Browser session ID to close"),
    },
    async (args: { sessionId: string }) => {
      try {
        await browserManager.closeSession(args.sessionId);
        
        return {
          content: [{
            type: "text",
            text: `Session ${args.sessionId} closed successfully`
          }],
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
    }
  );
}