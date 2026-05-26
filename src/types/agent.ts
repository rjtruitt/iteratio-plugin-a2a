/**
 * Determines what coordination privileges an agent has.
 * Orchestrators can spawn/terminate, workers execute tasks, tasks are one-shot.
 */
export type AgentRole = 'orchestrator' | 'worker' | 'task';

/**
 * Finite state machine for agent lifecycle. Transitions are managed
 * by AgentManager and emitted as events on the HiveEventBus.
 */
export type AgentState = 'idle' | 'running' | 'waiting' | 'paused' | 'completed' | 'failed';

/**
 * Core identity and runtime state for an agent instance.
 * Used by AgentRegistry and AgentManager for tracking active agents.
 */
export interface AgentIdentity {
  id: string;
  name: string;
  role: AgentRole | string;
  status: string;
  model?: string;
  spawnedAt?: number;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Point-in-time snapshot of agent execution state. Used for
 * health monitoring, idle detection, and timeout enforcement.
 */
export interface AgentStatus {
  id: string;
  state: AgentState;
  lastActivity: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

/**
 * Full specification for dynamically creating an agent at runtime.
 * Allows fine-grained control over model, tools, and resource budgets.
 */
export interface SpawnRequest {
  name: string;
  purpose: string;
  role?: AgentRole;
  model: string;
  tools?: string[]; // Tool IDs from tool registry
  systemPrompt?: string;
  context?: Record<string, unknown>;
  capabilities?: string[];

  /**
   * Available resources for this agent
   * Generic structure for injecting models, budgets, APIs, etc.
   *
   * Examples:
   * - { models: ['claude-opus', 'gpt-4'], defaultModel: 'claude-opus' }
   * - { budget: { maxCost: 1.0, maxTokens: 100000 } }
   * - { apis: { github: 'token123', slack: 'token456' } }
   */
  availableResources?: Record<string, unknown>;
}

/**
 * Reusable agent blueprint. Templates capture best-practice configurations
 * (model, tools, prompt, limits) so spawning is repeatable without
 * specifying every field each time.
 */
export interface AgentTemplate {
  id: string;
  displayName: string;
  role: AgentRole;
  description: string;
  tools: string[];
  systemPrompt: string;
  model: {
    primary: string;
    fallback?: string;
    upgradeConditions?: {
      ifComplexityAbove?: number;
      useModel?: string;
    };
  };
  limits?: {
    maxTokens?: number;
    maxDuration?: number;
    maxCost?: number;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Combines template-based and dynamic spawning into one config.
 * Supports partial overrides of templates for one-off customizations
 * without creating a new template definition.
 */
export interface SpawnOptions {
  // Option 1: Dynamic spawning
  request?: SpawnRequest;

  // Option 2: Template-based
  templateId?: string;
  overrides?: Partial<SpawnRequest>;

  // Common options
  channel?: string;
  autoJoin?: boolean;

  /**
   * Tool access control
   * Limit which tools from registry this agent can access
   * If not specified, agent gets all tools from template/request
   */
  toolAccess?: string[] | 'all' | 'none';

  /**
   * Resource access control
   * Inject available resources (models, budgets, APIs)
   * Merged with template/request resources
   */
  resourceAccess?: Record<string, unknown>;

  /**
   * System prompt override/enhancement
   * - string: Replace template prompt entirely
   * - { prepend: string }: Add before template prompt
   * - { append: string }: Add after template prompt
   * - { replace: string }: Replace template prompt
   */
  systemPrompt?:
    | string
    | { prepend: string }
    | { append: string }
    | { replace: string };

  /**
   * Agent lifecycle behavior
   * - 'persistent': Keeps running until explicitly stopped (default)
   * - 'one-shot': Completes task and exits automatically
   * - 'until-idle': Exits after period of inactivity
   */
  lifecycle?: 'persistent' | 'one-shot' | 'until-idle';

  /**
   * Exit conditions for one-shot/until-idle agents
   */
  exitConditions?: {
    onComplete?: boolean; // Exit when task marked complete
    onIdle?: number; // Exit after N ms of inactivity
    onError?: boolean; // Exit on first error
    maxMessages?: number; // Exit after N messages
  };
}
