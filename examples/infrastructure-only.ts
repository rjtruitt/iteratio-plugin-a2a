/**
 * Example: Infrastructure-only usage (like MCP)
 *
 * Shows how to use the A2A plugin for infrastructure without built-in tools.
 * This follows the MCP pattern where the plugin provides infrastructure,
 * and users decide which tools to register.
 */

import { A2APlugin, AgentRegistry, ChannelManager } from '../src/index.js';
import type { HiveTool, AgentTemplate } from '../src/index.js';
import { Container } from 'inversify';

// ============================================
// 1. Initialize Plugin (Infrastructure Only)
// ============================================

async function setupInfrastructure() {
  console.log('Setting up A2A infrastructure...\n');

  const container = new Container();
  const a2a = new A2APlugin();

  // Configure plugin
  a2a.configure({
    pattern: 'both', // Support both dispatch and hive patterns
    transport: {
      type: 'in-memory', // Use in-memory transport for this example
      config: {}
    },
    agentManager: {
      maxAgents: 50,
      autoRegister: true
    },
    channelManager: {
      maxChannels: 100
    },
    enableEventBus: true,
    enableMetrics: true
  });

  // Initialize (sets up infrastructure, NO tools registered)
  await a2a.initialize(container);

  console.log('Infrastructure ready!');
  console.log('- AgentRegistry: Available');
  console.log('- ChannelManager: Available');
  console.log('- Transport: In-Memory');
  console.log('- EventBus: Enabled');
  console.log('- Tools registered: 0 (infrastructure only)\n');

  return { a2a, container };
}

// ============================================
// 2. Use Infrastructure Directly
// ============================================

async function useInfrastructureDirectly(a2a: A2APlugin) {
  console.log('Using infrastructure directly (no tools)...\n');

  const { agentManager, channelManager, eventBus } = a2a.getInfrastructure();

  // Register an agent manually
  AgentRegistry.register({
    id: 'agent-1',
    name: 'Code Reviewer',
    role: 'worker',
    status: 'active',
    capabilities: ['code-review', 'security-analysis']
  });

  console.log('Registered agent:', AgentRegistry.get('agent-1')?.name);

  // Create a channel manually
  if (channelManager) {
    await channelManager.create('#code-review-123');
    await channelManager.join('#code-review-123', 'agent-1');
    console.log('Created channel:', '#code-review-123');
    console.log('Agent-1 joined channel');
  }

  // Check metrics
  const stats = a2a.getStats();
  console.log('\nInfrastructure Stats:');
  console.log('- Total agents:', stats.agents.totalAgents);
  console.log('- Total channels:', stats.channels.totalChannels);
  console.log('- Total tools:', stats.tools.totalTools);
  console.log();
}

// ============================================
// 3. Register Custom Tools
// ============================================

async function registerCustomTools(a2a: A2APlugin) {
  console.log('Registering custom tools...\n');

  // Define a custom coordination tool
  const customAnalysisTool: HiveTool = {
    name: 'custom_analysis',
    description: 'Custom analysis coordination tool',
    parameters: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'File or component to analyze'
        },
        analysisType: {
          type: 'string',
          enum: ['security', 'performance', 'quality'],
          description: 'Type of analysis to perform'
        }
      },
      required: ['target', 'analysisType']
    },
    handler: async (args: unknown) => {
      const { target, analysisType } = args as {
        target: string;
        analysisType: string;
      };

      console.log(`Analyzing ${target} for ${analysisType}...`);

      // Use infrastructure
      const { agentManager, channelManager } = a2a.getInfrastructure();

      // Create analysis channel
      const channelName = `#analysis-${Date.now()}`;
      if (channelManager) {
        await channelManager.create(channelName);
        console.log(`Created analysis channel: ${channelName}`);
      }

      // Find available workers
      const workers = AgentRegistry.getByRole('worker');
      console.log(`Found ${workers.length} available workers`);

      return {
        success: true,
        data: {
          channel: channelName,
          workersAvailable: workers.length,
          target,
          analysisType
        }
      };
    },
    metadata: {
      category: 'analysis',
      tags: ['custom', 'coordination', 'analysis'],
      cost: 'medium',
      dangerous: false
    }
  };

  // Register the custom tool
  a2a.registerTool(customAnalysisTool);

  console.log('Registered custom tool: custom_analysis');

  // Check updated stats
  const stats = a2a.getStats();
  console.log('Total tools now:', stats.tools.totalTools);
  console.log();

  return customAnalysisTool;
}

// ============================================
// 4. Register Optional Built-in Tools
// ============================================

async function registerBuiltinTools(a2a: A2APlugin) {
  console.log('Registering optional built-in tools...\n');

  // Import built-in tools (these are optional!)
  const {
    spawnWorkerTool,
    queryWorkerStatusTool,
    aggregateResultsTool
  } = await import('../src/tools/index.js');

  // Register only the tools we want
  a2a.registerTool(spawnWorkerTool);
  a2a.registerTool(queryWorkerStatusTool);
  a2a.registerTool(aggregateResultsTool);

  console.log('Registered 3 built-in tools:');
  console.log('- spawn_worker');
  console.log('- query_worker_status');
  console.log('- aggregate_results');

  const stats = a2a.getStats();
  console.log('Total tools now:', stats.tools.totalTools);
  console.log();
}

// ============================================
// 5. Use Registered Tools
// ============================================

async function useRegisteredTools(a2a: A2APlugin, customTool: HiveTool) {
  console.log('Using registered tools...\n');

  // Get all registered tools
  const tools = a2a.getTools();
  console.log('Available tools:', tools.map(t => t.name).join(', '));
  console.log();

  // Use custom tool
  console.log('Calling custom_analysis tool...');
  const result = await customTool.handler({
    target: 'auth.ts',
    analysisType: 'security'
  });

  console.log('Tool result:', result);
  console.log();
}

// ============================================
// 6. Clean Shutdown
// ============================================

async function cleanShutdown(a2a: A2APlugin) {
  console.log('Shutting down...\n');

  await a2a.shutdown();

  console.log('Shutdown complete:');
  console.log('- All agents terminated');
  console.log('- All channels closed');
  console.log('- All registries cleared');
  console.log();
}

// ============================================
// Run Example
// ============================================

(async () => {
  console.log('='.repeat(60));
  console.log('A2A Plugin Example: Infrastructure-Only Pattern');
  console.log('='.repeat(60));
  console.log();

  try {
    // 1. Setup infrastructure (no tools)
    const { a2a } = await setupInfrastructure();

    // 2. Use infrastructure directly
    await useInfrastructureDirectly(a2a);

    // 3. Register custom tools
    const customTool = await registerCustomTools(a2a);

    // 4. Register optional built-in tools
    await registerBuiltinTools(a2a);

    // 5. Use registered tools
    await useRegisteredTools(a2a, customTool);

    // 6. Clean shutdown
    await cleanShutdown(a2a);

    console.log('Example completed successfully!');
    console.log('Key takeaway: Plugin = Infrastructure, Tools = Optional');
  } catch (error) {
    console.error('Example failed:', error);
  }
})();

// ============================================
// Key Patterns Demonstrated
// ============================================

/**
 * 1. Plugin provides infrastructure only
 *    - No tools registered by default
 *    - User has full control
 *
 * 2. Infrastructure accessible directly
 *    - AgentRegistry for discovery
 *    - ChannelManager for communication
 *    - Transport for message delivery
 *
 * 3. Tools are opt-in
 *    - Import from 'iteratio-plugin-a2a/tools'
 *    - Register via plugin.registerTool()
 *    - Or create custom tools
 *
 * 4. Like MCP pattern
 *    - MCP plugin: infrastructure + optional tools
 *    - A2A plugin: infrastructure + optional tools
 */
