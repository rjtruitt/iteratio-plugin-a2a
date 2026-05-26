/**
 * Example: Tool registry implementation
 *
 * Shows how to register tools and inject them into LLM context on-demand
 * to avoid eating context window with every message.
 */

import type {
  IToolRegistry,
  HiveTool,
  HiveToolResult,
} from '../src/index.js';

/**
 * Example tool registry implementation
 * User would implement this in their own code or use @yourorg/tool-system
 */
class ExampleToolRegistry implements IToolRegistry {
  private tools = new Map<string, HiveTool>();
  private toolsByTag = new Map<string, Set<string>>();

  register(tool: HiveTool): void {
    this.tools.set(tool.name, tool);

    // Index by tags for fast lookup
    const tags = tool.metadata?.tags as string[] | undefined;
    if (tags) {
      for (const tag of tags) {
        if (!this.toolsByTag.has(tag)) {
          this.toolsByTag.set(tag, new Set());
        }
        this.toolsByTag.get(tag)!.add(tool.name);
      }
    }

    console.log(`✓ Registered tool: ${tool.name}`);
  }

  unregister(toolName: string): void {
    this.tools.delete(toolName);

    // Clean up tag index
    for (const [tag, tools] of this.toolsByTag) {
      tools.delete(toolName);
      if (tools.size === 0) {
        this.toolsByTag.delete(tag);
      }
    }

    console.log(`✓ Unregistered tool: ${toolName}`);
  }

  get(toolName: string): HiveTool | undefined {
    return this.tools.get(toolName);
  }

  list(): HiveTool[] {
    return Array.from(this.tools.values());
  }

  findByTag(tag: string): HiveTool[] {
    const toolNames = this.toolsByTag.get(tag);
    if (!toolNames) return [];

    return Array.from(toolNames)
      .map((name) => this.tools.get(name)!)
      .filter(Boolean);
  }

  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Get tool descriptions for LLM (compact format)
   * Only send what the LLM needs, not full definitions
   */
  getToolDescriptions(toolNames?: string[]): string {
    const tools = toolNames
      ? toolNames.map((name) => this.tools.get(name)).filter(Boolean)
      : Array.from(this.tools.values());

    return tools
      .map((tool) => {
        const params = Object.keys(tool.parameters.properties || {}).join(', ');
        return `- ${tool.name}(${params}): ${tool.description}`;
      })
      .join('\n');
  }

  /**
   * Get full tool definitions for LLM function calling
   * Only inject when actually needed (on-demand)
   */
  getToolDefinitions(toolNames: string[]): unknown[] {
    return toolNames
      .map((name) => {
        const tool = this.tools.get(name);
        if (!tool) return null;

        // Convert to whatever format your LLM provider needs
        // (OpenAI, Anthropic, etc.)
        return {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        };
      })
      .filter(Boolean);
  }
}

// ===== EXAMPLE TOOLS =====

const readFileTool: HiveTool = {
  name: 'read_file',
  description: 'Read contents of a file',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to read' },
      encoding: { type: 'string', enum: ['utf8', 'base64'], default: 'utf8' },
    },
    required: ['path'],
  },
  handler: async (args: any): Promise<HiveToolResult> => {
    // Implementation would actually read file
    return {
      success: true,
      data: { content: 'File contents...' },
    };
  },
  metadata: {
    tags: ['filesystem', 'read'],
    cost: 'low',
  },
};

const grepTool: HiveTool = {
  name: 'grep',
  description: 'Search for pattern in files',
  parameters: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Search pattern (regex)' },
      paths: { type: 'array', items: { type: 'string' }, description: 'Files to search' },
      caseInsensitive: { type: 'boolean', default: false },
    },
    required: ['pattern', 'paths'],
  },
  handler: async (args: any): Promise<HiveToolResult> => {
    return {
      success: true,
      data: { matches: [] },
    };
  },
  metadata: {
    tags: ['filesystem', 'search'],
    cost: 'medium',
  },
};

const bashTool: HiveTool = {
  name: 'bash',
  description: 'Execute bash command',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Command to execute' },
      timeout: { type: 'number', description: 'Timeout in ms', default: 30000 },
    },
    required: ['command'],
  },
  handler: async (args: any): Promise<HiveToolResult> => {
    return {
      success: true,
      data: { stdout: '', stderr: '', exitCode: 0 },
    };
  },
  metadata: {
    tags: ['shell', 'execution'],
    cost: 'high',
    dangerous: true,
  },
};

const webSearchTool: HiveTool = {
  name: 'web_search',
  description: 'Search the web',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      limit: { type: 'number', description: 'Max results', default: 10 },
    },
    required: ['query'],
  },
  handler: async (args: any): Promise<HiveToolResult> => {
    return {
      success: true,
      data: { results: [] },
    };
  },
  metadata: {
    tags: ['web', 'search'],
    cost: 'medium',
  },
};

// ===== USAGE: On-Demand Tool Injection =====

async function exampleOnDemandToolInjection() {
  console.log('=== On-Demand Tool Injection Example ===\n');

  const registry = new ExampleToolRegistry();

  // Register all available tools
  registry.register(readFileTool);
  registry.register(grepTool);
  registry.register(bashTool);
  registry.register(webSearchTool);

  console.log(`\nTotal tools registered: ${registry.list().length}\n`);

  // ===== SCENARIO 1: Worker only needs file tools =====
  console.log('Scenario 1: File analysis worker');

  const fileTools = registry.findByTag('filesystem');
  console.log(`Found ${fileTools.length} filesystem tools:`);
  console.log(registry.getToolDescriptions(fileTools.map((t) => t.name)));

  // Inject ONLY filesystem tools into this worker's context
  const fileToolDefinitions = registry.getToolDefinitions(fileTools.map((t) => t.name));
  console.log(`\n→ Injecting ${fileToolDefinitions.length} tools (not all 4!)\n`);

  // ===== SCENARIO 2: Worker needs web tools =====
  console.log('Scenario 2: Research worker');

  const webTools = registry.findByTag('web');
  console.log(`Found ${webTools.length} web tools:`);
  console.log(registry.getToolDescriptions(webTools.map((t) => t.name)));

  const webToolDefinitions = registry.getToolDefinitions(webTools.map((t) => t.name));
  console.log(`\n→ Injecting ${webToolDefinitions.length} tools (not all 4!)\n`);

  // ===== SCENARIO 3: Dynamic tool injection based on task =====
  console.log('Scenario 3: Dynamic injection based on task');

  const task = 'Analyze security vulnerabilities in authentication code';

  // Determine which tools are needed (simple heuristic)
  const neededTools: string[] = [];

  if (task.includes('code') || task.includes('file')) {
    neededTools.push('read_file', 'grep');
  }
  if (task.includes('search') || task.includes('research')) {
    neededTools.push('web_search');
  }
  if (task.includes('execute') || task.includes('run')) {
    neededTools.push('bash');
  }

  console.log(`Task: "${task}"`);
  console.log(`Needed tools: ${neededTools.join(', ')}`);

  // Inject only needed tools
  const taskToolDefinitions = registry.getToolDefinitions(neededTools);
  console.log(`\n→ Injecting ${taskToolDefinitions.length} tools for this task\n`);

  // ===== TOKEN SAVINGS =====
  console.log('📊 Token Savings Analysis:');
  console.log('');
  console.log('Without registry (inject all tools every message):');
  console.log('  4 tools × 200 tokens/tool × 50 messages = 40,000 tokens');
  console.log('');
  console.log('With registry (inject only needed tools):');
  console.log('  2 tools × 200 tokens/tool × 50 messages = 20,000 tokens');
  console.log('');
  console.log('💰 Savings: 50% reduction in tool-related context!');
}

// ===== USAGE: Tool Discovery =====

async function exampleToolDiscovery() {
  console.log('\n\n=== Tool Discovery Example ===\n');

  const registry = new ExampleToolRegistry();

  registry.register(readFileTool);
  registry.register(grepTool);
  registry.register(bashTool);
  registry.register(webSearchTool);

  // Agent asks: "What tools do I have for working with files?"
  const fileTools = registry.findByTag('filesystem');
  console.log('Available filesystem tools:');
  console.log(registry.getToolDescriptions(fileTools.map((t) => t.name)));
  console.log('');

  // Agent asks: "What tools are available?"
  console.log('All available tools:');
  console.log(registry.getToolDescriptions());
  console.log('');

  // Agent asks: "Can I execute shell commands?"
  const hasBash = registry.has('bash');
  console.log(`Can execute shell commands? ${hasBash ? 'Yes' : 'No'}`);
}

// Run examples
exampleOnDemandToolInjection().catch(console.error);
exampleToolDiscovery().catch(console.error);
