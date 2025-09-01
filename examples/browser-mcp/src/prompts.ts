import { Prompt } from "@nullshot/mcp";
import { BrowserRepository } from "./repository.js";

export function createBrowserPrompts(repository: BrowserRepository): Prompt[] {
  return [
    // Web Scraper Prompt
    {
      name: "web_scraper",
      description: "Generate a comprehensive web scraping strategy for a given website",
      arguments: [
        {
          name: "url",
          description: "The URL of the website to scrape",
          required: true,
        },
        {
          name: "data_requirements",
          description: "What specific data needs to be extracted (e.g., 'product prices and descriptions', 'news articles and dates')",
          required: true,
        },
        {
          name: "site_type",
          description: "Type of website (e.g., 'e-commerce', 'news', 'social media', 'documentation')",
          required: false,
        },
        {
          name: "complexity",
          description: "Expected complexity level: 'simple' (static content), 'medium' (some JS), 'complex' (heavy JS, SPA)",
          required: false,
        },
      ],
      handler: async (args: { 
        url: string; 
        data_requirements: string; 
        site_type?: string; 
        complexity?: string;
      }) => {
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
\`\`\`json
{
  "tool": "navigate",
  "args": {
    "url": "${args.url}",
    "viewport": { "width": 1280, "height": 720 },
    "waitUntil": "${args.complexity === 'complex' ? 'networkidle0' : 'networkidle2'}",
    "timeout": ${args.complexity === 'complex' ? 60000 : 30000}
  }
}
\`\`\`

### 2. Content Analysis
First, take a screenshot and extract the page structure to understand the layout:

\`\`\`json
{
  "tool": "screenshot",
  "args": {
    "fullPage": true,
    "format": "png"
  }
}
\`\`\`

Then analyze the page structure:
\`\`\`json
{
  "tool": "evaluate_js",
  "args": {
    "code": "return { title: document.title, headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.textContent), forms: Array.from(document.forms).length, links: Array.from(document.links).length }"
  }
}
\`\`\`

### 3. Data Extraction Strategy

Based on the data requirements "${args.data_requirements}", here are suggested extraction approaches:

${generateExtractionStrategy(args.data_requirements, args.site_type)}

### 4. Error Handling
- Implement wait conditions for dynamic content
- Handle pagination if present
- Manage rate limiting and respectful crawling
- Capture screenshots on errors for debugging

### 5. Data Validation
After extraction, validate the data:
- Check for required fields
- Verify data types and formats
- Handle missing or malformed data
- Log extraction success rates

### 6. Performance Optimization
${args.complexity === 'complex' 
  ? `- Use network idle conditions for SPA content
- Consider disabling images/CSS for faster loading
- Implement caching for repeated visits
- Use selective element screenshots instead of full page`
  : `- Use standard wait conditions
- Enable caching for repeated content
- Batch multiple extractions when possible`}

## Sample Implementation

Here's a complete example workflow:

\`\`\`javascript
// 1. Navigate to the page
const navResult = await mcp.call("navigate", {
  "url": "${args.url}",
  "viewport": { "width": 1280, "height": 720 },
  "waitUntil": "networkidle2"
});

// 2. Wait for content to load (if needed)
await mcp.call("wait_for", {
  "sessionId": navResult.sessionId,
  "condition": "element",
  "selector": "main, .content, [data-testid='content']", // Adjust based on site
  "timeout": 10000
});

// 3. Extract the required data
const extractResult = await mcp.call("extract_text", {
  "sessionId": navResult.sessionId,
  "selectors": {
    ${generateSampleSelectors(args.data_requirements, args.site_type)}
  }
});

// 4. Handle pagination or additional pages if needed
// 5. Save and validate the extracted data
\`\`\`

## Next Steps
1. Start with the navigation and initial analysis
2. Inspect the page structure to identify the correct selectors
3. Test extraction on a few sample elements
4. Scale up to full page extraction
5. Implement error handling and retries
6. Monitor and optimize performance

Remember to respect the website's robots.txt and terms of service!`;

          return {
            content: [{
              type: "text",
              text: prompt,
            }],
          };
        } catch (error) {
          throw new Error(`Failed to generate web scraping strategy: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    },

    // Automation Flow Prompt
    {
      name: "automation_flow",
      description: "Create a step-by-step browser automation workflow for complex tasks",
      arguments: [
        {
          name: "task_description",
          description: "Description of the automation task (e.g., 'fill out contact form and submit', 'search for products and compare prices')",
          required: true,
        },
        {
          name: "starting_url",
          description: "The URL where the automation should start",
          required: true,
        },
        {
          name: "expected_steps",
          description: "Number of expected steps or pages involved",
          required: false,
        },
        {
          name: "data_inputs",
          description: "Any data that needs to be input during the automation (JSON format)",
          required: false,
        },
      ],
      handler: async (args: {
        task_description: string;
        starting_url: string;
        expected_steps?: string;
        data_inputs?: string;
      }) => {
        try {
          const domain = new URL(args.starting_url).hostname;
          const inputData = args.data_inputs ? JSON.parse(args.data_inputs) : {};

          const prompt = `# Browser Automation Workflow

## Task Overview
**Task**: ${args.task_description}
**Starting URL**: ${args.starting_url}
**Domain**: ${domain}
**Expected Steps**: ${args.expected_steps || 'Multiple'}

## Input Data
${Object.keys(inputData).length > 0 
  ? `\`\`\`json
${JSON.stringify(inputData, null, 2)}
\`\`\``
  : 'No specific input data provided.'}

## Automation Strategy

### Step 1: Initial Setup and Navigation
\`\`\`json
{
  "tool": "navigate",
  "args": {
    "url": "${args.starting_url}",
    "viewport": { "width": 1280, "height": 720 },
    "waitUntil": "networkidle2",
    "timeout": 30000
  }
}
\`\`\`

### Step 2: Page Analysis and Preparation
Take a screenshot to understand the current page state:
\`\`\`json
{
  "tool": "screenshot",
  "args": {
    "fullPage": false,
    "format": "png"
  }
}
\`\`\`

Analyze interactive elements:
\`\`\`json
{
  "tool": "evaluate_js",
  "args": {
    "code": "return { forms: Array.from(document.forms).map(f => ({ action: f.action, method: f.method, elements: f.elements.length })), buttons: Array.from(document.querySelectorAll('button, input[type=submit]')).map(b => ({ text: b.textContent || b.value, type: b.type })), links: Array.from(document.querySelectorAll('a[href]')).slice(0, 10).map(a => ({ text: a.textContent, href: a.href })) }"
  }
}
\`\`\`

${generateAutomationSteps(args.task_description, inputData)}

### Error Handling and Recovery
\`\`\`json
{
  "tool": "evaluate_js",
  "args": {
    "code": "return { errors: Array.from(document.querySelectorAll('.error, .alert-danger, [role=alert]')).map(e => e.textContent), url: window.location.href, title: document.title }"
  }
}
\`\`\`

### Validation and Confirmation
After each major step, validate the results:
1. Check for success messages or confirmations
2. Verify URL changes indicate progress
3. Screenshot important states for debugging
4. Extract confirmation data when available

## Sample Complete Workflow

\`\`\`javascript
async function runAutomation() {
  let sessionId;
  
  try {
    // Step 1: Navigate to starting page
    const navResult = await mcp.call("navigate", {
      "url": "${args.starting_url}",
      "viewport": { "width": 1280, "height": 720 }
    });
    sessionId = navResult.sessionId;
    
    // Step 2: Wait for page to be ready
    await mcp.call("wait_for", {
      "sessionId": sessionId,
      "condition": "network",
      "timeout": 10000
    });
    
    // Step 3-N: Execute automation steps
    ${generateSampleWorkflow(args.task_description, inputData)}
    
    // Final: Capture results
    const finalScreenshot = await mcp.call("screenshot", {
      "sessionId": sessionId,
      "fullPage": true
    });
    
    return {
      success: true,
      sessionId: sessionId,
      finalScreenshot: finalScreenshot.screenshot
    };
    
  } catch (error) {
    // Error handling
    if (sessionId) {
      await mcp.call("screenshot", {
        "sessionId": sessionId,
        "fullPage": true
      });
    }
    throw error;
  }
}
\`\`\`

## Best Practices
1. **Wait Conditions**: Always wait for elements before interacting
2. **Error Handling**: Check for error messages after each action
3. **Screenshots**: Capture screenshots at key points for debugging
4. **Validation**: Verify each step completed successfully
5. **Cleanup**: Close sessions when done
6. **Rate Limiting**: Add delays between actions to be respectful

## Troubleshooting Tips
- If elements aren't found, try waiting longer or using different selectors
- For dynamic content, use \`wait_for\` with network or element conditions
- If forms don't submit, check for validation errors first
- Use \`evaluate_js\` to debug complex page states
- Consider using \`hover\` before \`click\` for dropdown menus

Start with the navigation step and adapt the selectors based on the actual page structure you encounter.`;

          return {
            content: [{
              type: "text",
              text: prompt,
            }],
          };
        } catch (error) {
          throw new Error(`Failed to generate automation flow: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    },

    // Data Extractor Prompt
    {
      name: "data_extractor",
      description: "Design extraction patterns for structured data from websites",
      arguments: [
        {
          name: "url",
          description: "The URL to extract data from",
          required: true,
        },
        {
          name: "data_structure",
          description: "Description of the expected data structure (e.g., 'list of products with name, price, rating')",
          required: true,
        },
        {
          name: "output_format",
          description: "Desired output format: 'json', 'csv', 'xml'",
          required: false,
        },
        {
          name: "pagination",
          description: "Whether the data spans multiple pages: 'true' or 'false'",
          required: false,
        },
      ],
      handler: async (args: {
        url: string;
        data_structure: string;
        output_format?: string;
        pagination?: string;
      }) => {
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
Start by understanding the page structure:

\`\`\`json
{
  "tool": "navigate",
  "args": {
    "url": "${args.url}",
    "viewport": { "width": 1280, "height": 720 }
  }
}
\`\`\`

\`\`\`json
{
  "tool": "evaluate_js",
  "args": {
    "code": "return { containers: Array.from(document.querySelectorAll('[class*=item], [class*=product], [class*=card], [class*=entry], [id*=item], [id*=product]')).slice(0, 5).map(el => ({ tagName: el.tagName, className: el.className, id: el.id })), lists: Array.from(document.querySelectorAll('ul, ol, .list, [class*=list]')).slice(0, 3).map(el => ({ tagName: el.tagName, className: el.className, children: el.children.length })) }"
  }
}
\`\`\`

### 2. Selector Development
Based on the data structure "${args.data_structure}", here are the recommended selectors:

${generateDataSelectors(args.data_structure)}

### 3. Extraction Implementation

#### Single Page Extraction
\`\`\`json
{
  "tool": "extract_text",
  "args": {
    "selectors": {
      ${generateExtractionSelectors(args.data_structure)}
    },
    "multiple": true,
    "waitForSelector": ".content, main, [data-testid='content']",
    "timeout": 10000
  }
}
\`\`\`

${hasPagination ? `#### Multi-Page Extraction
For paginated content, use this approach:

\`\`\`javascript
async function extractAllPages(sessionId) {
  const allData = [];
  let currentPage = 1;
  let hasNextPage = true;
  
  while (hasNextPage) {
    // Extract data from current page
    const pageData = await mcp.call("extract_text", {
      "sessionId": sessionId,
      "selectors": {
        ${generateExtractionSelectors(args.data_structure)}
      },
      "multiple": true
    });
    
    allData.push(...pageData.data);
    
    // Check for next page
    const nextPageExists = await mcp.call("evaluate_js", {
      "sessionId": sessionId,
      "code": "return !!document.querySelector('.next, .pagination .next, [aria-label*=next], [title*=next]')"
    });
    
    if (nextPageExists.result) {
      // Click next page
      await mcp.call("interact", {
        "sessionId": sessionId,
        "actions": [{
          "type": "click",
          "selector": ".next, .pagination .next, [aria-label*=next], [title*=next]"
        }]
      });
      
      // Wait for new content
      await mcp.call("wait_for", {
        "sessionId": sessionId,
        "condition": "network",
        "timeout": 10000
      });
      
      currentPage++;
    } else {
      hasNextPage = false;
    }
  }
  
  return allData;
}
\`\`\`` : ''}

### 4. Data Processing and Formatting

#### Clean and Validate Data
\`\`\`json
{
  "tool": "evaluate_js",
  "args": {
    "code": "function cleanData(rawData) { /* Add data cleaning logic here */ return rawData.filter(item => item && Object.keys(item).length > 0); }"
  }
}
\`\`\`

#### Format Output
${outputFormat === 'json' ? `
The data is already in JSON format. Ensure proper structure:
\`\`\`json
{
  "data": [...],
  "metadata": {
    "extractedAt": "ISO timestamp",
    "source": "${args.url}",
    "totalItems": "number",
    "pages": ${hasPagination ? '"number"' : '1'}
  }
}
\`\`\`
` : outputFormat === 'csv' ? `
Convert to CSV format:
\`\`\`javascript
function convertToCSV(data) {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header] || '';
      return \`"\${value.toString().replace(/"/g, '""')}"\`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\\n');
}
\`\`\`
` : `
Convert to XML format:
\`\`\`javascript
function convertToXML(data) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\\n<data>\\n';
  
  for (const item of data) {
    xml += '  <item>\\n';
    for (const [key, value] of Object.entries(item)) {
      xml += \`    <\${key}>\${value || ''}</\${key}>\\n\`;
    }
    xml += '  </item>\\n';
  }
  
  xml += '</data>';
  return xml;
}
\`\`\`
`}

## Complete Extraction Workflow

\`\`\`javascript
async function extractStructuredData() {
  let sessionId;
  
  try {
    // Navigate to the page
    const navResult = await mcp.call("navigate", {
      "url": "${args.url}",
      "viewport": { "width": 1280, "height": 720 }
    });
    sessionId = navResult.sessionId;
    
    // Wait for content to load
    await mcp.call("wait_for", {
      "sessionId": sessionId,
      "condition": "element",
      "selector": ".content, main, [data-testid='content']",
      "timeout": 15000
    });
    
    ${hasPagination 
      ? '// Extract from all pages\n    const allData = await extractAllPages(sessionId);'
      : `// Extract from single page
    const extractResult = await mcp.call("extract_text", {
      "sessionId": sessionId,
      "selectors": {
        ${generateExtractionSelectors(args.data_structure)}
      },
      "multiple": true
    });
    const allData = extractResult.data;`
    }
    
    // Clean and validate data
    const cleanedData = allData.filter(item => 
      item && Object.keys(item).length > 0
    );
    
    // Format according to requirements
    const formattedData = {
      data: cleanedData,
      metadata: {
        extractedAt: new Date().toISOString(),
        source: "${args.url}",
        totalItems: cleanedData.length,
        ${hasPagination ? 'pages: currentPage' : 'pages: 1'}
      }
    };
    
    return formattedData;
    
  } finally {
    if (sessionId) {
      await mcp.call("close_session", { "sessionId": sessionId });
    }
  }
}
\`\`\`

## Quality Assurance
1. **Data Completeness**: Verify all expected fields are extracted
2. **Data Accuracy**: Spot-check extracted values against the source
3. **Consistency**: Ensure data format is consistent across items
4. **Performance**: Monitor extraction speed and optimize selectors
5. **Error Handling**: Handle missing elements gracefully

## Optimization Tips
- Use more specific selectors to improve accuracy
- Implement caching for repeated extractions
- Add retry logic for network issues
- Consider rate limiting for large datasets
- Use screenshots to debug selector issues

Start with a small sample extraction to validate the selectors before scaling up to the full dataset.`;

          return {
            content: [{
              type: "text",
              text: prompt,
            }],
          };
        } catch (error) {
          throw new Error(`Failed to generate data extraction pattern: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    },
  ];
}

// Helper functions for generating dynamic content

function generateExtractionStrategy(dataRequirements: string, siteType?: string): string {
  const requirements = dataRequirements.toLowerCase();
  
  if (requirements.includes('product') || siteType === 'e-commerce') {
    return `**E-commerce Data Extraction**:
- Product titles: Usually in \`h1\`, \`.product-title\`, or \`[data-testid*=title]\`
- Prices: Look for \`.price\`, \`.cost\`, \`[data-testid*=price]\`, or elements containing currency symbols
- Images: Product images often in \`.product-image img\`, \`.gallery img\`, or \`[data-testid*=image]\`
- Descriptions: Typically in \`.description\`, \`.product-details\`, or \`[data-testid*=description]\`
- Reviews/Ratings: Check for \`.rating\`, \`.stars\`, \`.review-score\`, or \`[aria-label*=rating]\``;
  }
  
  if (requirements.includes('news') || requirements.includes('article') || siteType === 'news') {
    return `**News/Article Data Extraction**:
- Headlines: Usually \`h1\`, \`h2\`, \`.headline\`, \`.title\`, or \`[data-testid*=title]\`
- Content: Main article content in \`.content\`, \`.article-body\`, \`article\`, or \`[data-testid*=content]\`
- Dates: Look for \`.date\`, \`.published\`, \`time\` elements, or \`[data-testid*=date]\`
- Authors: Often in \`.author\`, \`.byline\`, or \`[data-testid*=author]\`
- Categories/Tags: Check \`.category\`, \`.tag\`, \`.section\`, or \`[data-testid*=category]\``;
  }
  
  if (requirements.includes('contact') || requirements.includes('form')) {
    return `**Form/Contact Data Extraction**:
- Form fields: Target \`input\`, \`textarea\`, \`select\` elements
- Labels: Associated \`label\` elements or \`[for]\` attributes
- Required fields: Look for \`[required]\`, \`.required\`, or \`[aria-required=true]\`
- Submit buttons: \`input[type=submit]\`, \`button[type=submit]\`, or \`.submit-btn\`
- Validation messages: \`.error\`, \`.validation\`, or \`[role=alert]\``;
  }
  
  return `**General Content Extraction**:
- Main content: Look for \`main\`, \`.content\`, \`.main\`, or \`[role=main]\`
- Headers: \`h1\`, \`h2\`, \`h3\` elements for structure
- Lists: \`ul\`, \`ol\`, \`.list\` for organized data
- Links: \`a[href]\` elements for navigation
- Images: \`img\` elements with \`src\` and \`alt\` attributes`;
}

function generateSampleSelectors(dataRequirements: string, siteType?: string): string {
  const requirements = dataRequirements.toLowerCase();
  
  if (requirements.includes('product') || siteType === 'e-commerce') {
    return `"title": ".product-title, h1, [data-testid*=title]",
    "price": ".price, .cost, [data-testid*=price]",
    "rating": ".rating, .stars, [aria-label*=rating]",
    "image": ".product-image img, .gallery img"`;
  }
  
  if (requirements.includes('news') || requirements.includes('article') || siteType === 'news') {
    return `"headline": "h1, .headline, [data-testid*=title]",
    "content": ".article-body, .content, article p",
    "date": ".date, time, [data-testid*=date]",
    "author": ".author, .byline, [data-testid*=author]"`;
  }
  
  return `"title": "h1, .title, [data-testid*=title]",
    "content": ".content, .main, [role=main]",
    "links": "a[href]",
    "text": "p, .text, .description"`;
}

function generateAutomationSteps(taskDescription: string, inputData: any): string {
  const task = taskDescription.toLowerCase();
  
  if (task.includes('form') || task.includes('contact') || task.includes('submit')) {
    return `### Step 3: Form Interaction
Identify and fill form fields:
\`\`\`json
{
  "tool": "interact",
  "args": {
    "actions": [
      ${Object.entries(inputData).map(([key, value]) => 
        `{ "type": "fill", "selector": "[name='${key}'], #${key}, [data-testid='${key}']", "value": "${value}" }`
      ).join(',\n      ')}
    ],
    "waitBetweenActions": 500
  }
}
\`\`\`

### Step 4: Form Submission
\`\`\`json
{
  "tool": "interact",
  "args": {
    "actions": [
      { "type": "click", "selector": "button[type='submit'], input[type='submit'], .submit-btn" }
    ]
  }
}
\`\`\`

### Step 5: Confirmation Check
\`\`\`json
{
  "tool": "wait_for",
  "args": {
    "condition": "element",
    "selector": ".success, .confirmation, [role='alert']",
    "timeout": 10000
  }
}
\`\`\``;
  }
  
  if (task.includes('search') || task.includes('find')) {
    return `### Step 3: Search Interaction
\`\`\`json
{
  "tool": "interact",
  "args": {
    "actions": [
      { "type": "fill", "selector": "input[type='search'], .search-input, [name='search'], [name='q']", "value": "${inputData.searchTerm || 'search term'}" },
      { "type": "click", "selector": "button[type='submit'], .search-btn, [aria-label*='search']" }
    ],
    "waitBetweenActions": 1000
  }
}
\`\`\`

### Step 4: Results Processing
\`\`\`json
{
  "tool": "wait_for",
  "args": {
    "condition": "element",
    "selector": ".results, .search-results, [data-testid*='results']",
    "timeout": 15000
  }
}
\`\`\`

### Step 5: Data Extraction
\`\`\`json
{
  "tool": "extract_text",
  "args": {
    "selectors": {
      "results": ".result-item, .search-result, [data-testid*='result']"
    },
    "multiple": true
  }
}
\`\`\``;
  }
  
  return `### Step 3: Page Interaction
Identify and interact with key elements:
\`\`\`json
{
  "tool": "interact",
  "args": {
    "actions": [
      { "type": "wait", "options": { "time": 2000 } },
      { "type": "scroll", "options": { "top": 500 } }
    ]
  }
}
\`\`\`

### Step 4: Data Collection
\`\`\`json
{
  "tool": "extract_text",
  "args": {
    "selector": "main, .content, [role='main']"
  }
}
\`\`\``;
}

function generateSampleWorkflow(taskDescription: string, inputData: any): string {
  const task = taskDescription.toLowerCase();
  
  if (task.includes('form')) {
    return `// Fill and submit form
    const formResult = await mcp.call("interact", {
      "sessionId": sessionId,
      "actions": [
        ${Object.entries(inputData).map(([key, value]) => 
          `{ "type": "fill", "selector": "[name='${key}']", "value": "${value}" }`
        ).join(',\n        ')},
        { "type": "click", "selector": "button[type='submit']" }
      ]
    });`;
  }
  
  if (task.includes('search')) {
    return `// Perform search
    const searchResult = await mcp.call("interact", {
      "sessionId": sessionId,
      "actions": [
        { "type": "fill", "selector": "[name='search']", "value": "${inputData.searchTerm || 'search term'}" },
        { "type": "click", "selector": ".search-btn" }
      ]
    });
    
    // Extract search results
    const results = await mcp.call("extract_text", {
      "sessionId": sessionId,
      "selectors": { "results": ".search-result" },
      "multiple": true
    });`;
  }
  
  return `// Perform custom interactions
    const interactionResult = await mcp.call("interact", {
      "sessionId": sessionId,
      "actions": [
        { "type": "scroll", "options": { "top": 500 } },
        { "type": "wait", "options": { "time": 2000 } }
      ]
    });`;
}

function generateDataSelectors(dataStructure: string): string {
  const structure = dataStructure.toLowerCase();
  
  if (structure.includes('product')) {
    return `**Product Data Selectors**:
- Container: \`.product, .item, [data-testid*=product]\`
- Title: \`.product-title, h2, h3, [data-testid*=title]\`
- Price: \`.price, .cost, [data-price], [data-testid*=price]\`
- Image: \`.product-image img, .thumbnail img\`
- Rating: \`.rating, .stars, [data-rating]\`
- Description: \`.description, .summary, [data-testid*=desc]\``;
  }
  
  if (structure.includes('article') || structure.includes('news')) {
    return `**Article Data Selectors**:
- Container: \`article, .post, .news-item, [data-testid*=article]\`
- Title: \`h1, h2, .title, .headline, [data-testid*=title]\`
- Content: \`.content, .body, .article-text, [data-testid*=content]\`
- Date: \`time, .date, .published, [data-testid*=date]\`
- Author: \`.author, .byline, [data-testid*=author]\`
- Category: \`.category, .section, .tag, [data-testid*=category]\``;
  }
  
  return `**General Data Selectors**:
- Container: \`.item, .card, .entry, [data-testid*=item]\`
- Title: \`h1, h2, h3, .title, [data-testid*=title]\`
- Content: \`.content, .text, .description, [data-testid*=content]\`
- Link: \`a[href], .link, [data-testid*=link]\`
- Meta: \`.meta, .info, .details, [data-testid*=meta]\``;
}

function generateExtractionSelectors(dataStructure: string): string {
  const structure = dataStructure.toLowerCase();
  
  if (structure.includes('product')) {
    return `"title": ".product-title, h2, h3",
      "price": ".price, .cost, [data-price]",
      "rating": ".rating, .stars",
      "image": ".product-image img",
      "description": ".description, .summary"`;
  }
  
  if (structure.includes('article') || structure.includes('news')) {
    return `"title": "h1, h2, .title, .headline",
      "content": ".content, .body, .article-text",
      "date": "time, .date, .published",
      "author": ".author, .byline",
      "category": ".category, .section"`;
  }
  
  return `"title": "h1, h2, h3, .title",
      "content": ".content, .text, .description",
      "link": "a[href]",
      "meta": ".meta, .info"`;
}
