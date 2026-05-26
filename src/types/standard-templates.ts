/**
 * Standard Agent Templates
 *
 * Reference configurations that encode best-practice patterns for common
 * agent roles. Users extend or override these rather than starting from
 * scratch, ensuring consistent behavior (status reporting, overlap checking,
 * budget awareness) across all spawned agents.
 */

import type { AgentTemplate } from './agent.js';

/**
 * Well-known template identifiers. Implementations map these to full
 * AgentTemplate objects; users can also define custom IDs.
 */
export type StandardTemplateId =
  | 'default-subagent' // Generic worker with status reporting
  | 'one-shot-worker' // Completes task and exits
  | 'orchestrator' // Spawns and coordinates workers
  | 'code-reviewer' // Reviews code for issues
  | 'researcher' // Researches topics
  | 'tester' // Runs tests
  | 'debugger'; // Diagnoses bugs

/**
 * Type map of all standard templates. Implementation libraries fill these
 * with concrete AgentTemplate objects; consumers reference by key.
 */
export interface StandardTemplates {
  /**
   * Default Sub-Agent
   *
   * Generic worker that:
   * - Reports status to channels
   * - Updates work registry
   * - Reports findings at completion
   * - Uses sticky reminders for best practices
   *
   * Use this when: You need a basic worker with good habits
   */
  'default-subagent': AgentTemplate;

  /**
   * One-Shot Worker
   *
   * Completes a single task and exits:
   * - Announces work start
   * - Completes task
   * - Reports results
   * - Exits automatically
   *
   * Use this when: Task has clear completion point
   */
  'one-shot-worker': AgentTemplate;

  /**
   * Orchestrator
   *
   * Spawns and coordinates workers:
   * - Can spawn sub-agents
   * - Monitors work registry for overlaps
   * - Merges worker results
   * - Manages budgets
   *
   * Use this when: You need to coordinate multiple workers
   */
  orchestrator: AgentTemplate;

  /**
   * Code Reviewer
   *
   * Reviews code for issues:
   * - Reads files
   * - Checks for security issues
   * - Checks for bugs
   * - Suggests improvements
   *
   * Use this when: You need code review
   */
  'code-reviewer': AgentTemplate;

  /**
   * Researcher
   *
   * Researches topics:
   * - Searches documentation
   * - Reads files
   * - Synthesizes findings
   * - Reports summary
   *
   * Use this when: You need information gathering
   */
  researcher: AgentTemplate;

  /**
   * Tester
   *
   * Runs tests:
   * - Runs test suites
   * - Analyzes failures
   * - Reports results
   *
   * Use this when: You need test execution
   */
  tester: AgentTemplate;

  /**
   * Debugger
   *
   * Diagnoses bugs:
   * - Analyzes error logs
   * - Traces execution
   * - Identifies root cause
   * - Suggests fixes
   *
   * Use this when: You need bug diagnosis
   */
  debugger: AgentTemplate;
}

/**
 * Factory for creating customized templates from standard bases.
 * Allows prompt injection, tool filtering, and sticky attachment
 * without modifying the base template definition.
 */
export interface ITemplateBuilder {
  /**
   * Create template with custom prompts
   */
  build(
    baseTemplate: StandardTemplateId,
    customizations: {
      systemPrompt?: string;
      tools?: string[];
      stickies?: string[]; // Sticky IDs to attach
      exitConditions?: any;
      metadata?: Record<string, unknown>;
    }
  ): AgentTemplate;
}

/**
 * Example: Default Sub-Agent Template Configuration
 *
 * This shows what a real implementation might look like.
 * Users customize this for their needs.
 */
export const DEFAULT_SUBAGENT_CONFIG = {
  id: 'default-subagent',
  displayName: 'Default Sub-Agent',
  role: 'worker' as const,
  description: 'Generic worker with status reporting and best practices',

  // Tools needed (user maps to their tool IDs)
  tools: [
    'send_message', // Report to channels
    'update_status', // Update status board
    'read_file', // Read files (if needed)
    // Add more as needed
  ],

  // System prompt (user customizes)
  systemPrompt: `You are a helpful sub-agent working as part of a larger system.

IMPORTANT RESPONSIBILITIES:
1. **Announce your work** - Use work-announcement when starting
2. **Update status** - Keep status board current
3. **Check for overlaps** - Query work registry before starting
4. **Report findings** - Always summarize results before exiting
5. **Use channels** - Communicate through channels, not direct messages

WORKFLOW:
1. Receive task
2. Check work registry for overlaps
3. Announce work to channel
4. Update status board
5. Complete task
6. Report findings to channel
7. Mark complete

Remember: You're part of a team. Communicate clearly and often.`,

  // Model configuration (user provides their model names)
  model: {
    primary: 'default', // User replaces with their model name
    fallback: undefined,
  },

  // Limits
  limits: {
    maxTokens: 50000,
    maxDuration: 300000, // 5 minutes
    maxCost: 1.0,
  },

  // Stickies that come pre-attached
  stickies: [
    {
      id: 'report-completion',
      content: '📝 REMINDER: Report findings before exiting',
      type: 'reminder',
      position: 'both', // Sandwich theory!
      priority: 'high',
    },
    {
      id: 'check-overlaps',
      content: '🔍 REMINDER: Check work registry before starting',
      type: 'reminder',
      position: 'top',
      priority: 'medium',
    },
    {
      id: 'update-status',
      content: '📍 REMINDER: Update status board when work changes',
      type: 'reminder',
      position: 'top',
      priority: 'medium',
    },
  ],
};

/**
 * Example: One-Shot Worker Template Configuration
 */
export const ONE_SHOT_WORKER_CONFIG = {
  id: 'one-shot-worker',
  displayName: 'One-Shot Worker',
  role: 'task' as const,
  description: 'Completes a single task and exits',

  tools: ['send_message', 'read_file'], // Minimal tools

  systemPrompt: `You are a one-shot worker. Complete your task and exit.

WORKFLOW:
1. Receive task
2. Complete task
3. Report results
4. Exit

Keep it simple and focused. You have ONE job.`,

  model: {
    primary: 'default',
  },

  limits: {
    maxTokens: 10000,
    maxDuration: 60000, // 1 minute
    maxCost: 0.1,
  },

  // Exit automatically on completion
  lifecycle: 'one-shot' as const,
  exitConditions: {
    onComplete: true,
    maxMessages: 10, // Safety limit
  },

  stickies: [
    {
      id: 'one-shot-reminder',
      content: '⚡ REMINDER: Complete task and EXIT (you are one-shot)',
      type: 'reminder',
      position: 'both',
      priority: 'critical',
    },
  ],
};

/**
 * Example: Orchestrator Template Configuration
 */
export const ORCHESTRATOR_CONFIG = {
  id: 'orchestrator',
  displayName: 'Orchestrator',
  role: 'orchestrator' as const,
  description: 'Spawns and coordinates workers',

  tools: [
    'spawn', // Spawn workers
    'pause',
    'resume',
    'send_message',
    'merge_results',
    'query_work_registry',
  ],

  systemPrompt: `You are an orchestrator. Coordinate workers to complete complex tasks.

RESPONSIBILITIES:
1. **Plan work** - Break down tasks for workers
2. **Check for overlaps** - Prevent duplicate work
3. **Spawn workers** - Create workers with clear tasks
4. **Monitor progress** - Watch worker status
5. **Merge results** - Combine worker outputs
6. **Manage budgets** - Keep workers under budget

BEST PRACTICES:
- Check work registry before spawning workers
- Give workers clear, focused tasks
- Monitor for runaway workers (token/cost overruns)
- Merge results with compression to save tokens
- Report summary to parent/channel when complete`,

  model: {
    primary: 'default',
    upgradeConditions: {
      ifComplexityAbove: 8,
      useModel: 'smart', // User provides their smart model name
    },
  },

  limits: {
    maxTokens: 200000,
    maxDuration: 600000, // 10 minutes
    maxCost: 10.0,
  },

  stickies: [
    {
      id: 'check-registry',
      content: '🔍 REMINDER: Check work registry before spawning workers',
      type: 'reminder',
      position: 'top',
      priority: 'high',
    },
    {
      id: 'budget-monitor',
      content: '💰 REMINDER: Monitor worker budgets',
      type: 'constraint',
      position: 'both',
      priority: 'high',
    },
  ],
};
