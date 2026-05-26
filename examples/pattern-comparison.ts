/**
 * Pattern Comparison: Old vs New
 *
 * Shows the difference between:
 * - OLD: Plugin with built-in tools (bad)
 * - NEW: Plugin with infrastructure only (good, like MCP)
 */

// ============================================
// OLD PATTERN (BAD)
// ============================================

/**
 * OLD WAY: Plugin automatically registers tools
 *
 * Problems:
 * - User has no control over which tools are available
 * - Can't customize tool behavior
 * - Can't disable unwanted tools
 * - Tools are tightly coupled to plugin
 * - Not following MCP pattern
 */
async function oldPattern_BuiltInTools() {
  /*
  // OLD CODE (hypothetical):
  import { A2APlugin } from 'iteratio-plugin-a2a';

  const a2a = new A2APlugin();
  await a2a.initialize(container);

  // Problem: Tools automatically registered!
  // - SpawnWorkerTool
  // - BroadcastTool
  // - SendMessageTool
  // - etc.

  // User has NO control:
  // - Can't disable tools
  // - Can't customize behavior
  // - Can't add custom tools easily
  // - Stuck with what plugin provides

  const tools = a2a.getTools();
  // Returns built-in tools whether user wants them or not
  */

  console.log('OLD PATTERN: Plugin with built-in tools (BAD)');
  console.log('- Tools automatically registered');
  console.log('- No user control');
  console.log('- Not following MCP pattern');
  console.log();
}

// ============================================
// NEW PATTERN (GOOD - Like MCP)
// ============================================

/**
 * NEW WAY: Infrastructure only, tools are opt-in
 *
 * Benefits:
 * - User has full control over which tools to use
 * - Can customize tool behavior
 * - Can add custom tools easily
 * - Infrastructure is decoupled from tools
 * - Follows MCP pattern
 */
async function newPattern_InfrastructureOnly() {
  /*
  // NEW CODE:
  import { A2APlugin } from 'iteratio-plugin-a2a';
  import {
    spawnWorkerTool,
    broadcastToWorkersTool
  } from 'iteratio-plugin-a2a/tools';

  const a2a = new A2APlugin();
  await a2a.initialize(container);

  // Infrastructure ready, NO tools registered yet
  const tools = a2a.getTools();  // Returns [] - empty!

  // User decides which tools to register:

  // Option 1: Use built-in tools
  a2a.registerTool(spawnWorkerTool);
  a2a.registerTool(broadcastToWorkersTool);

  // Option 2: Use custom tools
  a2a.registerTool(myCustomTool);

  // Option 3: Mix both
  a2a.registerTool(spawnWorkerTool);
  a2a.registerTool(myCustomCoordinationTool);

  // Option 4: Use infrastructure directly (no tools at all)
  const { agentManager, channelManager } = a2a.getInfrastructure();
  // Programmatic access without tool calls
  */

  console.log('NEW PATTERN: Infrastructure only, tools opt-in (GOOD)');
  console.log('- Infrastructure provided');
  console.log('- Tools are optional');
  console.log('- User has full control');
  console.log('- Follows MCP pattern');
  console.log();
}

// ============================================
// Side-by-Side Comparison
// ============================================

async function sideByComparison() {
  console.log('='.repeat(80));
  console.log('PATTERN COMPARISON: Old vs New');
  console.log('='.repeat(80));
  console.log();

  console.log('+---------------------------------+----------------------------------+');
  console.log('| OLD PATTERN (BAD)               | NEW PATTERN (GOOD - Like MCP)    |');
  console.log('+---------------------------------+----------------------------------+');
  console.log('| Plugin = Infrastructure + Tools | Plugin = Infrastructure only     |');
  console.log('| Tools auto-registered           | Tools are opt-in                 |');
  console.log('| No user control                 | Full user control                |');
  console.log('| Tightly coupled                 | Loosely coupled                  |');
  console.log('| Not customizable                | Fully customizable               |');
  console.log('| NOT like MCP                    | Like MCP                         |');
  console.log('+---------------------------------+----------------------------------+');
  console.log();

  console.log('USAGE COMPARISON:\n');

  console.log('OLD WAY:');
  console.log(`
  const a2a = new A2APlugin();
  await a2a.initialize(container);
  // Done - tools already registered
  // Problem: No control!
  `);

  console.log('NEW WAY:');
  console.log(`
  const a2a = new A2APlugin();
  await a2a.initialize(container);

  // User decides:
  import { spawnWorkerTool } from 'iteratio-plugin-a2a/tools';
  a2a.registerTool(spawnWorkerTool);
  a2a.registerTool(myCustomTool);
  // Control: User chooses!
  `);

  console.log();
  console.log('='.repeat(80));
}

// ============================================
// MCP Pattern Comparison
// ============================================

async function mcpPatternComparison() {
  console.log('='.repeat(80));
  console.log('MCP PATTERN ALIGNMENT');
  console.log('='.repeat(80));
  console.log();

  console.log('MCP PLUGIN (Model Context Protocol):');
  console.log(`
  // MCP provides infrastructure
  const mcp = new MCPPlugin();
  await mcp.initialize(container);

  // Tools are separate and opt-in
  import { readFileTool, writeFileTool } from 'mcp/tools';
  mcp.registerTool(readFileTool);
  mcp.registerTool(writeFileTool);
  `);

  console.log('A2A PLUGIN (Agent-to-Agent Coordination):');
  console.log(`
  // A2A provides infrastructure
  const a2a = new A2APlugin();
  await a2a.initialize(container);

  // Tools are separate and opt-in
  import { spawnWorkerTool, broadcastToWorkersTool } from 'iteratio-plugin-a2a/tools';
  a2a.registerTool(spawnWorkerTool);
  a2a.registerTool(broadcastToWorkersTool);
  `);

  console.log('PATTERN ALIGNMENT:');
  console.log('- Both plugins provide infrastructure');
  console.log('- Both have tools as opt-in imports');
  console.log('- Both give user full control');
  console.log('- Both follow separation of concerns');
  console.log();

  console.log('='.repeat(80));
}

// ============================================
// Real-World Usage Scenarios
// ============================================

async function realWorldScenarios() {
  console.log('='.repeat(80));
  console.log('REAL-WORLD USAGE SCENARIOS');
  console.log('='.repeat(80));
  console.log();

  console.log('SCENARIO 1: Minimal (Infrastructure only)');
  console.log(`
  import { A2APlugin } from 'iteratio-plugin-a2a';

  const a2a = new A2APlugin();
  await a2a.initialize(container);

  // Use infrastructure directly, no tools
  const { agentManager, channelManager } = a2a.getInfrastructure();

  // Programmatic usage
  await agentManager.spawn(template);
  await channelManager.create('#analysis');
  `);

  console.log('SCENARIO 2: Dispatch-style (Worker management)');
  console.log(`
  import { A2APlugin } from 'iteratio-plugin-a2a';
  import { dispatchTools } from 'iteratio-plugin-a2a/tools';

  const a2a = new A2APlugin();
  a2a.configure({ pattern: 'dispatch' });
  await a2a.initialize(container);

  // Register dispatch tools
  dispatchTools.forEach(tool => a2a.registerTool(tool));

  // Agent can now use:
  // - spawn_worker
  // - query_worker_status
  // - aggregate_results
  `);

  console.log('SCENARIO 3: Hive-style (Channel coordination)');
  console.log(`
  import { A2APlugin } from 'iteratio-plugin-a2a';
  import { hiveTools } from 'iteratio-plugin-a2a/tools';

  const a2a = new A2APlugin();
  a2a.configure({ pattern: 'hive' });
  await a2a.initialize(container);

  // Register hive tools
  hiveTools.forEach(tool => a2a.registerTool(tool));

  // Agent can now use:
  // - create_channel
  // - join_channel
  // - broadcast_to_workers
  `);

  console.log('SCENARIO 4: Custom (Your own tools)');
  console.log(`
  import { A2APlugin } from 'iteratio-plugin-a2a';
  import type { HiveTool } from 'iteratio-plugin-a2a';

  const a2a = new A2APlugin();
  await a2a.initialize(container);

  // Define custom coordination tool
  const myTool: HiveTool = {
    name: 'my_coordination',
    description: 'Custom coordination logic',
    // ... implementation
  };

  a2a.registerTool(myTool);
  `);

  console.log('SCENARIO 5: Hybrid (Built-in + Custom)');
  console.log(`
  import { A2APlugin } from 'iteratio-plugin-a2a';
  import { spawnWorkerTool } from 'iteratio-plugin-a2a/tools';

  const a2a = new A2APlugin();
  await a2a.initialize(container);

  // Mix built-in and custom
  a2a.registerTool(spawnWorkerTool);
  a2a.registerTool(myAnalysisTool);
  a2a.registerTool(myReportingTool);
  `);

  console.log();
  console.log('='.repeat(80));
}

// ============================================
// Run All Comparisons
// ============================================

(async () => {
  console.log('\n\n');
  await sideByComparison();
  console.log('\n');
  await mcpPatternComparison();
  console.log('\n');
  await realWorldScenarios();
  console.log('\n');

  console.log('KEY TAKEAWAYS:');
  console.log('1. Plugin = Infrastructure, NOT Tools');
  console.log('2. Tools are opt-in imports from "iteratio-plugin-a2a/tools"');
  console.log('3. Users have full control over which tools to use');
  console.log('4. Pattern matches MCP (Model Context Protocol)');
  console.log('5. Separation of concerns: infrastructure vs tools');
  console.log();
})();
