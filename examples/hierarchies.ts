/**
 * Example: Agent Hierarchies - Turtles All The Way Down
 *
 * Demonstrates how overseer -> orchestrator -> worker hierarchies
 * all use the same coordination primitives.
 */

import type {
  ICoordinator,
  IToolRegistry,
  SpawnOptions,
  Message,
  AgentTemplate,
} from '../src/index.js';

// ===== MOCK IMPLEMENTATIONS =====

class MockCoordinator implements ICoordinator {
  private agents = new Map<string, { name: string; channels: string[] }>();

  async spawn(options: SpawnOptions): Promise<string> {
    const id = `agent-${Date.now()}`;
    const name = options.request?.name || options.templateId || 'agent';

    console.log(`\n🐣 Spawned: ${name} (${id})`);
    console.log(`   Template: ${options.templateId || 'dynamic'}`);
    console.log(`   Channel: ${options.channel || 'none'}`);
    console.log(`   Tools: ${options.toolAccess || 'all'}`);
    console.log(
      `   Resources: ${JSON.stringify(options.resourceAccess || {})}`
    );

    this.agents.set(id, { name, channels: [] });
    return id;
  }

  async send(
    agentId: string,
    channel: string,
    message: Message
  ): Promise<void> {
    console.log(`\n📤 ${agentId} -> ${channel}: ${message.type}`);
  }

  async broadcast(channel: string, message: Message): Promise<void> {
    console.log(`\n📢 Broadcast to ${channel}: ${message.type}`);
  }

  async pause(agentId: string): Promise<void> {
    console.log(`\n⏸️  Paused: ${agentId}`);
  }

  async resume(agentId: string): Promise<void> {
    console.log(`\n▶️  Resumed: ${agentId}`);
  }

  async cancel(agentId: string): Promise<void> {
    console.log(`\n❌ Cancelled: ${agentId}`);
  }
}

class MockToolRegistry implements IToolRegistry {
  private tools = new Map<string, any>();

  async register(tool: any): Promise<void> {
    this.tools.set(tool.id, tool);
    console.log(`   ✓ Registered tool: ${tool.id}`);
  }

  async get(toolId: string): Promise<any> {
    return this.tools.get(toolId);
  }

  async findByTag(tag: string): Promise<any[]> {
    return Array.from(this.tools.values()).filter((t) =>
      t.tags?.includes(tag)
    );
  }

  async listAll(): Promise<any[]> {
    return Array.from(this.tools.values());
  }
}

// ===== SCENARIOS =====

async function scenario1_ThreeLayers() {
  console.log('=== SCENARIO 1: Three-Layer Hierarchy ===');
  console.log('Overseer -> Orchestrator -> Worker');

  const coordinator = new MockCoordinator();

  // LAYER 1: Overseer
  console.log('\n--- LAYER 1: Overseer ---');
  const overseer = await coordinator.spawn({
    templateId: 'overseer',
    channel: '#overseers',
    toolAccess: ['spawn', 'pause', 'resume', 'kill'],
    resourceAccess: {
      models: ['claude-opus-4', 'gpt-4-turbo', 'claude-sonnet-4'],
      defaultModel: 'claude-opus-4',
      budget: { maxCost: 100.0, maxTokens: 1000000 },
    },
  });

  // LAYER 2: Orchestrator (spawned by overseer)
  console.log('\n--- LAYER 2: Orchestrator (spawned by overseer) ---');
  const orchestrator = await coordinator.spawn({
    templateId: 'orchestrator',
    channel: '#orchestrators',
    toolAccess: ['spawn', 'merge', 'pause'],
    resourceAccess: {
      models: ['claude-sonnet-4', 'claude-haiku-4'],
      defaultModel: 'claude-sonnet-4',
      budget: { maxCost: 20.0, maxTokens: 200000 },
    },
  });

  // LAYER 3: Worker (spawned by orchestrator)
  console.log('\n--- LAYER 3: Worker (spawned by orchestrator) ---');
  const worker = await coordinator.spawn({
    templateId: 'code-reviewer',
    channel: '#code-review',
    toolAccess: ['read_file', 'write_file', 'git'],
    resourceAccess: {
      models: ['claude-sonnet-4'],
      budget: { maxCost: 2.0, maxTokens: 20000 },
    },
  });

  console.log('\n💡 Notice: All three use same spawn() interface!');
  console.log('   Only difference: tools, resources, budgets');
}

async function scenario2_ToolAccessControl() {
  console.log('\n\n=== SCENARIO 2: Tool Access Control ===');

  const coordinator = new MockCoordinator();
  const toolRegistry = new MockToolRegistry();

  // Register all tools
  console.log('\n📦 Registering tools:');
  await toolRegistry.register({
    id: 'spawn',
    name: 'Spawn Agent',
    category: 'coordination',
    dangerous: true,
  });
  await toolRegistry.register({
    id: 'merge',
    name: 'Merge Worker Results',
    category: 'coordination',
    dangerous: false,
  });
  await toolRegistry.register({
    id: 'read_file',
    name: 'Read File',
    category: 'filesystem',
    dangerous: false,
  });
  await toolRegistry.register({
    id: 'write_file',
    name: 'Write File',
    category: 'filesystem',
    dangerous: true,
  });

  // Overseer gets coordination tools
  console.log('\n--- Overseer (coordination tools only) ---');
  await coordinator.spawn({
    templateId: 'overseer',
    toolAccess: ['spawn', 'pause', 'resume', 'kill'], // No file access!
  });

  // Worker gets filesystem tools
  console.log('\n--- Worker (filesystem tools only) ---');
  await coordinator.spawn({
    templateId: 'code-reviewer',
    toolAccess: ['read_file', 'write_file'], // No spawn/pause!
  });

  console.log('\n💡 Same tool registry, different access control');
}

async function scenario3_ResourceInjection() {
  console.log('\n\n=== SCENARIO 3: Resource Injection (Models & Budgets) ===');

  const coordinator = new MockCoordinator();

  // Overseer: Full model suite + big budget
  console.log('\n--- Overseer: Full Resources ---');
  await coordinator.spawn({
    templateId: 'overseer',
    resourceAccess: {
      models: ['claude-opus-4', 'gpt-4-turbo', 'claude-sonnet-4'],
      defaultModel: 'claude-opus-4',
      budget: { maxCost: 100.0, maxTokens: 1000000 },
      apis: { github: 'token123', slack: 'token456' },
    },
  });

  // Orchestrator: Mid-tier models + medium budget
  console.log('\n--- Orchestrator: Medium Resources ---');
  await coordinator.spawn({
    templateId: 'orchestrator',
    resourceAccess: {
      models: ['claude-sonnet-4', 'claude-haiku-4'],
      defaultModel: 'claude-sonnet-4',
      budget: { maxCost: 20.0, maxTokens: 200000 },
      apis: { github: 'token123' }, // No Slack access
    },
  });

  // Worker: Single model + small budget
  console.log('\n--- Worker: Minimal Resources ---');
  await coordinator.spawn({
    templateId: 'code-reviewer',
    resourceAccess: {
      models: ['claude-sonnet-4'], // Only one model
      budget: { maxCost: 2.0, maxTokens: 20000 },
      // No API access
    },
  });

  console.log('\n💡 Resources flow down: overseer > orchestrator > worker');
}

async function scenario4_MonitoringAlerts() {
  console.log('\n\n=== SCENARIO 4: Monitoring & Alerts (Same Primitives) ===');

  const coordinator = new MockCoordinator();

  // Overseer subscribes to alert channel
  console.log('\n--- Overseer: Subscribe to #alerts ---');
  const overseer = await coordinator.spawn({
    templateId: 'overseer',
    channel: '#overseers',
  });

  // Orchestrator detects runaway worker
  console.log('\n--- Orchestrator: Detect runaway worker ---');
  const orchestrator = await coordinator.spawn({
    templateId: 'orchestrator',
    channel: '#orchestrators',
  });

  // Send alert (same message system!)
  await coordinator.send(orchestrator, '#alerts', {
    type: 'declarative',
    subtype: 'warning',
    payload: {
      message: 'Worker approaching token limit',
      agentId: 'worker-123',
      tokenCount: 95000,
      limit: 100000,
    },
    senderId: orchestrator,
    timestamp: Date.now(),
  });

  // Overseer intervenes (same coordination primitives!)
  console.log('\n--- Overseer: Intervene ---');
  await coordinator.pause('worker-123');

  console.log('\n💡 Same message/channel system for monitoring');
}

async function scenario5_OverlappingWork() {
  console.log('\n\n=== SCENARIO 5: Overlapping Work Detection ===');
  console.log('All layers use same work discovery primitives');

  const coordinator = new MockCoordinator();

  // Worker 1 announces work
  console.log('\n--- Worker 1: Announce work ---');
  const worker1 = await coordinator.spawn({
    templateId: 'code-reviewer',
    channel: '#code-review',
  });

  await coordinator.send(worker1, '#code-review', {
    type: 'declarative',
    subtype: 'work-announcement',
    payload: {
      agentId: worker1,
      workType: 'code-review',
      primaryResource: '/src/auth/login.ts',
      keywords: ['security', 'auth', 'login'],
    },
    senderId: worker1,
    timestamp: Date.now(),
  });

  // Worker 2 checks before starting
  console.log('\n--- Worker 2: Check for overlapping work ---');
  const worker2 = await coordinator.spawn({
    templateId: 'code-reviewer',
    channel: '#code-review',
  });

  console.log('   🔍 Query work registry for /src/auth/login.ts...');
  console.log('   ⚠️  Found existing work by worker-1');
  console.log('   💡 Suggest: Collaborate instead of duplicating');

  // Request collaboration (same message system!)
  await coordinator.send(worker2, '#code-review', {
    type: 'coordination-request',
    subtype: 'collaborate',
    payload: {
      targetAgentId: worker1,
      reason: 'Already working on same file',
    },
    senderId: worker2,
    timestamp: Date.now(),
  });

  console.log('\n💡 Same work discovery for all layers');
}

async function scenario6_BudgetEnforcement() {
  console.log('\n\n=== SCENARIO 6: Budget Enforcement (Turtles Down) ===');

  const coordinator = new MockCoordinator();

  // Overseer: $100 budget
  console.log('\n--- Overseer: $100 budget ---');
  const overseer = await coordinator.spawn({
    templateId: 'overseer',
    resourceAccess: {
      budget: { maxCost: 100.0 },
    },
  });

  // Orchestrator 1: $20 budget (20% of overseer)
  console.log('\n--- Orchestrator 1: $20 budget (20% of overseer) ---');
  const orch1 = await coordinator.spawn({
    templateId: 'orchestrator',
    resourceAccess: {
      budget: { maxCost: 20.0 },
    },
  });

  // Orchestrator 2: $20 budget (20% of overseer)
  console.log('\n--- Orchestrator 2: $20 budget (20% of overseer) ---');
  const orch2 = await coordinator.spawn({
    templateId: 'orchestrator',
    resourceAccess: {
      budget: { maxCost: 20.0 },
    },
  });

  // Worker 1: $2 budget (10% of orchestrator 1)
  console.log('\n--- Worker 1: $2 budget (10% of orch1) ---');
  await coordinator.spawn({
    templateId: 'code-reviewer',
    resourceAccess: {
      budget: { maxCost: 2.0 },
    },
  });

  // Worker 2: $2 budget (10% of orchestrator 1)
  console.log('\n--- Worker 2: $2 budget (10% of orch1) ---');
  await coordinator.spawn({
    templateId: 'tester',
    resourceAccess: {
      budget: { maxCost: 2.0 },
    },
  });

  console.log('\n💰 Budget flows: $100 -> $20 -> $2');
  console.log('   Each layer gets fraction of parent');
}

// Run all scenarios
(async () => {
  await scenario1_ThreeLayers();
  await scenario2_ToolAccessControl();
  await scenario3_ResourceInjection();
  await scenario4_MonitoringAlerts();
  await scenario5_OverlappingWork();
  await scenario6_BudgetEnforcement();

  console.log('\n\n=== KEY TAKEAWAYS ===');
  console.log('1. Same primitives everywhere (channels, messages, stickies)');
  console.log('2. Differentiation through access control (tools, resources)');
  console.log('3. Monitoring through subscriptions (all layers subscribe)');
  console.log('4. No special logic needed (just spawn agents that spawn agents)');
  console.log('5. It\'s turtles all the way down 🐢🐢🐢');
})();
