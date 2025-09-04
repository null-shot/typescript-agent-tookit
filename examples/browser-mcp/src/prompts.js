import { z } from 'zod';
export function setupBrowserPrompts(server, repository) {
    // Web Scraper Prompt
    server.prompt("web_scraper", "Generate a comprehensive web scraping strategy for a given website", {
        url: z.string().describe("The URL of the website to scrape"),
        data_requirements: z.string().describe("What specific data needs to be extracted"),
        site_type: z.string().optional().describe("Type of website (e.g., 'e-commerce', 'news')"),
        complexity: z.string().optional().describe("Expected complexity level: 'simple', 'medium', 'complex'"),
    }, async (args) => {
        try {
            // Check if we have existing patterns for this domain
            const domain = new URL(args.url).hostname;
            const existingPatterns = await repository.getExtractionPatternsByDomain(domain);
            const prompt = `# Web Scraping Strategy for ${args.url}

## Target Information
- **URL**: ${args.url}
- **Domain**: ${domain}
- **Site Type**: ${args.site_type || 'Unknown'}
- **Complexity**: ${args.complexity || 'Medium'}
- **Data Requirements**: ${args.data_requirements}

## Existing Patterns
${existingPatterns.length > 0
                ? `Found ${existingPatterns.length} existing extraction patterns for this domain:
${existingPatterns.map(p => `- **${p.name}**: ${p.description} (Success Rate: ${p.successRate}%)`).join('\n')}

Consider reusing or adapting these patterns.`
                : 'No existing patterns found for this domain. You\'ll need to create new extraction strategies.'}

## Recommended Approach

### 1. Initial Navigation
Use the navigate tool to access the target page with appropriate settings.

### 2. Content Analysis
Take a screenshot and extract page structure to understand the layout.

### 3. Data Extraction Strategy
Based on the data requirements "${args.data_requirements}", use appropriate CSS selectors.

### 4. Error Handling
- Implement wait conditions for dynamic content
- Handle pagination if present
- Manage rate limiting and respectful crawling

Remember to respect the website's robots.txt and terms of service!`;
            return {
                messages: [{
                        role: 'assistant',
                        content: {
                            type: 'text',
                            text: prompt
                        }
                    }]
            };
        }
        catch (error) {
            throw new Error(`Failed to generate web scraping strategy: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    // Automation Flow Prompt
    server.prompt("automation_flow", "Create a step-by-step browser automation workflow for complex tasks", {
        task_description: z.string().describe("Description of the automation task"),
        starting_url: z.string().describe("The URL where the automation should start"),
        expected_steps: z.string().optional().describe("Number of expected steps or pages involved"),
    }, async (args) => {
        try {
            const domain = new URL(args.starting_url).hostname;
            const prompt = `# Browser Automation Workflow

## Task Overview
**Task**: ${args.task_description}
**Starting URL**: ${args.starting_url}
**Domain**: ${domain}
**Expected Steps**: ${args.expected_steps || 'Multiple'}

## Automation Strategy

### Step 1: Initial Setup and Navigation
Start by navigating to the target page with appropriate settings.

### Step 2: Page Analysis and Preparation
Take a screenshot to understand the current page state and analyze interactive elements.

## Best Practices
1. **Wait Conditions**: Always wait for elements before interacting
2. **Error Handling**: Check for error messages after each action
3. **Screenshots**: Capture screenshots at key points for debugging
4. **Validation**: Verify each step completed successfully
5. **Cleanup**: Close sessions when done

Start with the navigation step and adapt based on the actual page structure you encounter.`;
            return {
                messages: [{
                        role: 'assistant',
                        content: {
                            type: 'text',
                            text: prompt
                        }
                    }]
            };
        }
        catch (error) {
            throw new Error(`Failed to generate automation flow: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    // Data Extractor Prompt
    server.prompt("data_extractor", "Design extraction patterns for structured data from websites", {
        url: z.string().describe("The URL to extract data from"),
        data_structure: z.string().describe("Description of the expected data structure"),
        output_format: z.string().optional().describe("Desired output format: 'json', 'csv', 'xml'"),
        pagination: z.string().optional().describe("Whether the data spans multiple pages: 'true' or 'false'"),
    }, async (args) => {
        try {
            const domain = new URL(args.url).hostname;
            const hasPagination = args.pagination === 'true';
            const outputFormat = args.output_format || 'json';
            const prompt = `# Data Extraction Pattern Design

## Target Information
- **URL**: ${args.url}
- **Domain**: ${domain}
- **Data Structure**: ${args.data_structure}
- **Output Format**: ${outputFormat}
- **Pagination**: ${hasPagination ? 'Yes' : 'No'}

## Extraction Strategy

### 1. Initial Page Analysis
Start by understanding the page structure and then extract the required data.

### 2. Implementation
Use the browser MCP tools to navigate, extract data, and handle any pagination.

## Quality Assurance
1. **Data Completeness**: Verify all expected fields are extracted
2. **Data Accuracy**: Spot-check extracted values against the source
3. **Consistency**: Ensure data format is consistent across items
4. **Performance**: Monitor extraction speed and optimize selectors

Start with a small sample extraction to validate the approach before scaling up.`;
            return {
                messages: [{
                        role: 'assistant',
                        content: {
                            type: 'text',
                            text: prompt
                        }
                    }]
            };
        }
        catch (error) {
            throw new Error(`Failed to generate data extraction pattern: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
}
