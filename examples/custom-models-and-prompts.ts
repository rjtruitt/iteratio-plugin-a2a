/**
 * Example: Custom Models and Prompts
 *
 * Shows how to use hive-orchestrator with YOUR model setup,
 * YOUR naming conventions, and YOUR custom prompts.
 */

import type { SpawnOptions } from '../src/index.js';
import {
  DEFAULT_SUBAGENT_CONFIG,
  ONE_SHOT_WORKER_CONFIG,
  ORCHESTRATOR_CONFIG,
} from '../src/types/standard-templates.js';

// ===== SCENARIO 1: Bring Your Own Model Names =====

async function scenario1_CustomModelNames() {
  console.log('=== SCENARIO 1: Custom Model Names ===');

  // User only has OpenAI models
  const openAISetup: SpawnOptions = {
    templateId: 'default-subagent',
    resourceAccess: {
      models: ['gpt-4o', 'gpt-4o-mini'], // Their model names
      defaultModel: 'gpt-4o-mini', // Start cheap
      upgradeModel: 'gpt-4o', // Upgrade when needed
      budget: { maxCost: 1.0 },
    },
  };

  console.log('OpenAI Setup:', JSON.stringify(openAISetup, null, 2));

  // User has Anthropic models
  const anthropicSetup: SpawnOptions = {
    templateId: 'default-subagent',
    resourceAccess: {
      models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
      defaultModel: 'claude-3-5-haiku-20241022',
      upgradeModel: 'claude-3-5-sonnet-20241022',
      budget: { maxCost: 1.0 },
    },
  };

  console.log('Anthropic Setup:', JSON.stringify(anthropicSetup, null, 2));

  // User has custom local models
  const localSetup: SpawnOptions = {
    templateId: 'default-subagent',
    resourceAccess: {
      models: ['llama-70b', 'llama-13b'],
      defaultModel: 'llama-13b',
      upgradeModel: 'llama-70b',
      apiEndpoint: 'http://localhost:8080/v1', // Local server
      budget: { maxTokens: 100000 }, // No cost tracking for local
    },
  };

  console.log('Local Model Setup:', JSON.stringify(localSetup, null, 2));

  // User has mixed setup
  const mixedSetup: SpawnOptions = {
    templateId: 'orchestrator',
    resourceAccess: {
      models: {
        cheap: 'gpt-4o-mini',
        medium: 'claude-3-5-sonnet-20241022',
        expensive: 'gpt-4o',
        local: 'llama-70b',
      },
      defaultModel: 'cheap',
      budget: { maxCost: 10.0 },
    },
  };

  console.log('Mixed Setup:', JSON.stringify(mixedSetup, null, 2));
}

// ===== SCENARIO 2: Custom System Prompts =====

async function scenario2_CustomPrompts() {
  console.log('\n\n=== SCENARIO 2: Custom System Prompts ===');

  // Prepend to template prompt
  const withPrepend: SpawnOptions = {
    templateId: 'default-subagent',
    systemPrompt: {
      prepend: `COMPANY POLICY: All code must follow our security guidelines.
      - No hardcoded credentials
      - Use parameterized queries
      - Validate all inputs

      `,
    },
  };

  console.log('With Prepend:', JSON.stringify(withPrepend, null, 2));

  // Append to template prompt
  const withAppend: SpawnOptions = {
    templateId: 'default-subagent',
    systemPrompt: {
      append: `

      ADDITIONAL CONTEXT:
      - You're working in a Node.js monorepo
      - Use TypeScript strict mode
      - Tests required for all new code`,
    },
  };

  console.log('With Append:', JSON.stringify(withAppend, null, 2));

  // Replace template prompt entirely
  const fullyCustom: SpawnOptions = {
    templateId: 'default-subagent',
    systemPrompt: {
      replace: `You are a specialized security auditor.

      Your job: Review code for vulnerabilities.

      Focus on:
      - SQL injection
      - XSS
      - CSRF
      - Authentication bypass
      - Authorization issues

      Report findings to #security channel.`,
    },
  };

  console.log('Fully Custom:', JSON.stringify(fullyCustom, null, 2));

  // Simple string (replaces prompt)
  const simpleString: SpawnOptions = {
    templateId: 'one-shot-worker',
    systemPrompt: 'You are a one-shot worker. Complete the task and exit.',
  };

  console.log('Simple String:', JSON.stringify(simpleString, null, 2));
}

// ===== SCENARIO 3: Super Expensive Smart Worker =====

async function scenario3_ExpensiveSmartWorker() {
  console.log('\n\n=== SCENARIO 3: Super Expensive Smart Worker ===');
  console.log("User says: 'Spawn a worker that's super expensive and smart, I don't care'");

  const expensiveWorker: SpawnOptions = {
    templateId: 'default-subagent',
    resourceAccess: {
      models: ['gpt-4o', 'claude-opus-4'], // Most expensive models
      defaultModel: 'claude-opus-4', // Start with best
      budget: {
        maxCost: 100.0, // High budget
        maxTokens: 1000000, // No token limit
      },
    },
    systemPrompt: {
      prepend: `You have a LARGE BUDGET. Use it wisely but don't be afraid to think deeply.

      `,
    },
    overrides: {
      capabilities: ['complex-reasoning', 'deep-analysis', 'creative-solutions'],
    },
  };

  console.log('Expensive Smart Worker:', JSON.stringify(expensiveWorker, null, 2));
}

// ===== SCENARIO 4: One-Shot Worker (Single Task, Exit) =====

async function scenario4_OneShotWorker() {
  console.log('\n\n=== SCENARIO 4: One-Shot Worker (Task + Exit) ===');

  const oneShot: SpawnOptions = {
    templateId: 'one-shot-worker',
    lifecycle: 'one-shot',
    exitConditions: {
      onComplete: true, // Exit when task done
      maxMessages: 5, // Safety limit
      onError: false, // Don't exit on error (retry)
    },
    resourceAccess: {
      models: ['gpt-4o-mini'], // Cheap model
      budget: { maxCost: 0.1 }, // Small budget
    },
  };

  console.log('One-Shot Worker:', JSON.stringify(oneShot, null, 2));
}

// ===== SCENARIO 5: Using Standard Templates as Base =====

async function scenario5_CustomizeStandardTemplate() {
  console.log('\n\n=== SCENARIO 5: Customize Standard Templates ===');

  // Start with default subagent config
  const customTemplate = {
    ...DEFAULT_SUBAGENT_CONFIG,

    // Override model names
    model: {
      primary: 'gpt-4o-mini', // User's model name
      fallback: 'gpt-4o',
    },

    // Add custom tools
    tools: [...DEFAULT_SUBAGENT_CONFIG.tools, 'custom_tool_1', 'custom_tool_2'],

    // Customize prompt
    systemPrompt: `${DEFAULT_SUBAGENT_CONFIG.systemPrompt}

ADDITIONAL INSTRUCTIONS:
- You're working in a React/TypeScript codebase
- Use functional components with hooks
- Write tests with Vitest
- Follow our style guide at /docs/STYLE.md`,

    // Adjust limits
    limits: {
      ...DEFAULT_SUBAGENT_CONFIG.limits,
      maxCost: 2.0, // Increase budget
    },

    // Add custom stickies
    stickies: [
      ...DEFAULT_SUBAGENT_CONFIG.stickies,
      {
        id: 'company-policy',
        content: '⚠️ COMPANY POLICY: Security review required for auth changes',
        type: 'constraint',
        position: 'both',
        priority: 'critical',
      },
    ],
  };

  console.log('Customized Template:', JSON.stringify(customTemplate, null, 2));
}

// ===== SCENARIO 6: Dynamic Model Selection =====

async function scenario6_DynamicModelSelection() {
  console.log('\n\n=== SCENARIO 6: Dynamic Model Selection ===');

  // User provides model selection function
  const dynamicSetup: SpawnOptions = {
    templateId: 'orchestrator',
    resourceAccess: {
      models: {
        // Define tiers
        cheap: 'gpt-4o-mini',
        medium: 'claude-3-5-sonnet-20241022',
        expensive: 'gpt-4o',
      },

      // Selection strategy (user implements)
      selectModel: (context: {
        complexity?: number;
        budget?: number;
        priority?: string;
      }) => {
        if (context.priority === 'critical') return 'expensive';
        if (context.complexity && context.complexity > 7) return 'expensive';
        if (context.budget && context.budget < 0.5) return 'cheap';
        return 'medium';
      },

      budget: { maxCost: 10.0 },
    },
  };

  console.log('Dynamic Model Selection:', JSON.stringify(dynamicSetup, null, 2));
}

// ===== SCENARIO 7: Real-World Configuration =====

async function scenario7_RealWorldConfig() {
  console.log('\n\n=== SCENARIO 7: Real-World Configuration ===');
  console.log('How a real company might configure their agents');

  const productionConfig: SpawnOptions = {
    templateId: 'default-subagent',

    // Company's model setup
    resourceAccess: {
      models: {
        default: 'claude-3-5-sonnet-20241022',
        fallback: 'gpt-4o',
        summarization: 'claude-3-5-haiku-20241022', // Cheap for summaries
      },
      defaultModel: 'default',

      // APIs they use
      apis: {
        github: process.env.GITHUB_TOKEN,
        slack: process.env.SLACK_TOKEN,
        datadog: process.env.DATADOG_API_KEY,
      },

      // Budget per agent
      budget: {
        maxCost: 1.0,
        maxTokens: 50000,
        warningThreshold: 0.8, // Alert at 80%
      },
    },

    // Company's standard prompt
    systemPrompt: {
      prepend: `ACME Corp Agent - Follow company guidelines:
      - Security: /docs/SECURITY.md
      - Style Guide: /docs/STYLE.md
      - Testing: /docs/TESTING.md

      `,
    },

    // Lifecycle
    lifecycle: 'persistent',
    exitConditions: {
      onIdle: 300000, // Exit after 5min idle
      maxMessages: 1000, // Safety limit
    },

    // Tools they've registered
    toolAccess: [
      'read_file',
      'write_file',
      'run_tests',
      'git',
      'github_api',
      'slack_api',
      'send_message',
      'update_status',
    ],
  };

  console.log('Production Config:', JSON.stringify(productionConfig, null, 2));
}

// Run all scenarios
(async () => {
  await scenario1_CustomModelNames();
  await scenario2_CustomPrompts();
  await scenario3_ExpensiveSmartWorker();
  await scenario4_OneShotWorker();
  await scenario5_CustomizeStandardTemplate();
  await scenario6_DynamicModelSelection();
  await scenario7_RealWorldConfig();

  console.log('\n\n=== KEY TAKEAWAYS ===');
  console.log('1. Bring your own model names (OpenAI, Anthropic, local, mixed)');
  console.log('2. Customize prompts (prepend, append, replace)');
  console.log('3. Control budgets and limits per agent');
  console.log('4. Standard templates as starting point');
  console.log('5. One-shot workers for single tasks');
  console.log('6. Dynamic model selection based on context');
  console.log('7. Real-world configs with company policies');
})();
