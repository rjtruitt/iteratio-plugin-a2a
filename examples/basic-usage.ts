/**
 * Basic usage example: Using hive-orchestrator types
 */

import type {
  AgentIdentity,
  DeclarativeMessages,
  TriggerMessages,
  IDeclarativeHandler,
  DeclarativeMessage,
  AgentTemplate,
  CoordinationPattern,
} from '../src/index.js';

// 1. Define agent identity
const orchestrator: AgentIdentity = {
  id: 'orch-1',
  name: 'Main Orchestrator',
  role: 'orchestrator',
  model: 'claude-sonnet-4',
  capabilities: ['spawn', 'coordinate', 'summarize'],
};

console.log('✅ Orchestrator:', orchestrator.name);

// 2. Send declarative message (zero tokens!)
const progressUpdate: DeclarativeMessages.ExecutionProgress = {
  id: crypto.randomUUID(),
  from: 'worker-1',
  timestamp: Date.now(),
  type: 'execution.progress',
  percent: 75,
  currentStep: 'Analyzing security vulnerabilities',
  stepsCompleted: 3,
  stepsTotal: 4,
};

console.log('✅ Progress update:', `${progressUpdate.percent}% complete`);

// 3. Check threshold (simple comparison - no LLM!)
const stats: DeclarativeMessages.ExecutionStats = {
  id: crypto.randomUUID(),
  from: 'worker-1',
  timestamp: Date.now(),
  type: 'execution.stats',
  toolCallCount: 52,
  llmCallCount: 12,
  tokensUsed: { input: 8000, output: 3000 },
  elapsedMs: 45000,
  memoryUsedMb: 256,
  costUsd: 0.33,
};

const TOOL_THRESHOLD = 50;
if (stats.toolCallCount > TOOL_THRESHOLD) {
  const trigger: TriggerMessages.ToolCountThreshold = {
    id: crypto.randomUUID(),
    from: 'monitor',
    timestamp: Date.now(),
    type: 'trigger.toolcount',
    current: stats.toolCallCount,
    threshold: TOOL_THRESHOLD,
    exceeded: true,
    action: 'warn',
  };

  console.log('⚠️  Tool count exceeded:', `${trigger.current} > ${trigger.threshold}`);
}

// 4. Define agent template
const codeReviewer: AgentTemplate = {
  id: 'code-reviewer',
  displayName: 'Code Reviewer',
  role: 'worker',
  description: 'Reviews code for security and quality issues',
  tools: ['read_file', 'grep', 'bash'],
  systemPrompt: 'You are a thorough code reviewer focusing on security.',
  model: {
    primary: 'claude-sonnet-4',
    fallback: 'claude-haiku-4',
  },
  limits: {
    maxTokens: 100000,
    maxDuration: 300000,
    maxCost: 5.0,
  },
};

console.log('✅ Template defined:', codeReviewer.displayName);

// 5. Store coordination pattern
const pattern: CoordinationPattern = {
  id: crypto.randomUUID(),
  scenario: 'code-review',
  approach: 'Spawned 3 workers: security scanner (Opus), docs checker (Haiku), test analyzer (Haiku)',
  outcome: 'success',
  metadata: {
    workersSpawned: 3,
    tokensUsed: 25000,
    durationMs: 45000,
    tags: ['security', 'large-pr', 'multi-worker'],
    timestamp: Date.now(),
  },
};

console.log('✅ Pattern stored:', pattern.scenario);

// 6. Implement custom handler
class ToolCountHandler implements IDeclarativeHandler {
  private readonly threshold: number;

  constructor(threshold: number) {
    this.threshold = threshold;
  }

  canHandle(msg: DeclarativeMessage): boolean {
    return msg.type === 'execution.stats';
  }

  async handle(msg: DeclarativeMessage): Promise<void | DeclarativeMessage> {
    if (msg.type === 'execution.stats') {
      const stats = msg as DeclarativeMessages.ExecutionStats;

      // Simple comparison - NO LLM!
      if (stats.toolCallCount > this.threshold) {
        console.log('🔥 Handler detected high tool usage:', stats.toolCallCount);

        return {
          id: crypto.randomUUID(),
          from: 'handler',
          timestamp: Date.now(),
          type: 'trigger.toolcount',
          current: stats.toolCallCount,
          threshold: this.threshold,
          exceeded: true,
          action: 'warn',
        } as TriggerMessages.ToolCountThreshold;
      }
    }
  }
}

(async () => {
  const handler = new ToolCountHandler(50);
  const canHandle = handler.canHandle(stats);
  console.log('✅ Handler can process stats?', canHandle);

  const triggerResult = await handler.handle(stats);
  if (triggerResult) {
    console.log('✅ Handler emitted trigger:', triggerResult.type);
  }

  console.log('\n🎉 All examples passed! Hive Orchestrator types working correctly.');
})();
