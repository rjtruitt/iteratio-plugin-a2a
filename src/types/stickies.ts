/**
 * Sticky system - Persistent reminders injected into agent context.
 *
 * Solves the "lost in the middle" problem: LLMs attend most to the start
 * and end of their context window. Stickies use "sandwich theory" to place
 * critical reminders at both positions, surviving across turns without
 * manual re-injection.
 */

/**
 * A persistent context injection attached to an agent. Survives across
 * turns until explicitly removed or expired, ensuring the agent never
 * forgets critical constraints or reminders.
 */
export interface Sticky {
  id: string;
  agentId: string;

  // Content
  content: string; // The sticky text
  type: StickyType;

  // Positioning (sandwich theory)
  position: 'top' | 'bottom' | 'both'; // Where to inject in context

  // Lifecycle
  createdAt: number;
  expiresAt?: number; // Auto-remove after this time
  removeAfterUse?: boolean; // Remove after next LLM call

  // Priority (for token budget management)
  priority: 'critical' | 'high' | 'medium' | 'low';

  // Conditions
  showWhen?: StickyCondition;

  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * Category that determines rendering priority and auto-cleanup behavior.
 */
export type StickyType =
  | 'reminder' // "Don't forget to use grep before bash"
  | 'tool-hint' // "You have access to read_file tool"
  | 'constraint' // "Stay under 50 tool calls"
  | 'status' // "Currently working on /src/auth"
  | 'context' // "Other workers: worker-1 (auth), worker-2 (db)"
  | 'warning' // "⚠️ You're approaching token limit"
  | 'instruction' // "Always validate input before SQL queries"
  | 'temporary'; // Short-lived reminder

/**
 * Conditional visibility rules. A sticky only appears in context when
 * its conditions are met, preventing unnecessary token consumption.
 */
export interface StickyCondition {
  // Show only when using specific tools
  whenUsingTools?: string[];

  // Show only in specific channels
  whenInChannels?: string[];

  // Show only when certain keywords mentioned
  whenKeywords?: string[];

  // Show only after N messages
  afterMessageCount?: number;

  // Custom condition function (user implements)
  customCheck?: (context: StickyCheckContext) => boolean;
}

/**
 * Context for sticky condition checks
 */
export interface StickyCheckContext {
  agentId: string;
  messageCount: number;
  currentChannel?: string;
  recentTools?: string[];
  recentMessages?: string[];
}

/**
 * CRUD and query interface for managing an agent's sticky collection.
 * Handles lifecycle (expiration, use-once removal) and builds the
 * sandwich-formatted injection string for context assembly.
 */
export interface IStickyRegistry {
  /**
   * Add sticky to agent
   */
  add(sticky: Sticky): Promise<void>;

  /**
   * Remove sticky
   */
  remove(stickyId: string): Promise<void>;

  /**
   * Remove all stickies for agent
   */
  removeAll(agentId: string): Promise<void>;

  /**
   * Get all active stickies for agent
   */
  getActive(
    agentId: string,
    context?: StickyCheckContext
  ): Promise<Sticky[]>;

  /**
   * Get stickies by position
   */
  getByPosition(
    agentId: string,
    position: 'top' | 'bottom' | 'both',
    context?: StickyCheckContext
  ): Promise<Sticky[]>;

  /**
   * Build context injection string (sandwich format)
   * Returns { top: string, bottom: string }
   */
  buildContextInjection(
    agentId: string,
    options?: {
      maxTokens?: number; // Token budget for stickies
      context?: StickyCheckContext;
    }
  ): Promise<StickyInjection>;

  /**
   * Mark sticky as used (auto-remove if removeAfterUse=true)
   */
  markUsed(stickyId: string): Promise<void>;

  /**
   * Clean up expired stickies
   */
  cleanup(): Promise<number>;

  /**
   * Update sticky content
   */
  update(stickyId: string, updates: Partial<Sticky>): Promise<void>;
}

/**
 * Pre-rendered text ready for injection at context boundaries.
 * `top` goes before messages, `bottom` goes after -- maximizing attention.
 */
export interface StickyInjection {
  top: string; // Inject at START of context (most important!)
  bottom: string; // Inject at END of context (reminder!)
  tokenCount: number;
  stickyCount: number;
}

/**
 * Sticky builder (fluent API)
 */
export interface IStickyBuilder {
  /**
   * Create new sticky
   */
  create(agentId: string, content: string): IStickyBuilder;

  /**
   * Set type
   */
  type(type: StickyType): IStickyBuilder;

  /**
   * Set position (sandwich theory)
   */
  position(position: 'top' | 'bottom' | 'both'): IStickyBuilder;

  /**
   * Set priority
   */
  priority(priority: 'critical' | 'high' | 'medium' | 'low'): IStickyBuilder;

  /**
   * Set expiration
   */
  expiresIn(ms: number): IStickyBuilder;

  /**
   * Remove after use
   */
  removeAfterUse(): IStickyBuilder;

  /**
   * Show only when using specific tools
   */
  whenUsingTools(tools: string[]): IStickyBuilder;

  /**
   * Show only in specific channels
   */
  whenInChannels(channels: string[]): IStickyBuilder;

  /**
   * Build and register sticky
   */
  build(): Promise<Sticky>;
}

/**
 * Sticky templates (common patterns)
 */
export interface StickyTemplate {
  name: string;
  description: string;
  create: (params: Record<string, unknown>) => Sticky;
}

/**
 * Example templates:
 */
export const CommonStickyTemplates = {
  /**
   * Remind agent about tool availability
   */
  toolReminder: (agentId: string, toolName: string, hint: string): Sticky => ({
    id: crypto.randomUUID(),
    agentId,
    content: `💡 Available tool: ${toolName} - ${hint}`,
    type: 'tool-hint',
    position: 'top',
    priority: 'medium',
    createdAt: Date.now(),
    showWhen: {
      whenKeywords: [toolName],
    },
  }),

  /**
   * Constraint reminder
   */
  constraint: (agentId: string, constraint: string): Sticky => ({
    id: crypto.randomUUID(),
    agentId,
    content: `⚠️ CONSTRAINT: ${constraint}`,
    type: 'constraint',
    position: 'both', // Show at top AND bottom!
    priority: 'critical',
    createdAt: Date.now(),
  }),

  /**
   * Status update
   */
  status: (agentId: string, status: string, expiresInMs: number): Sticky => ({
    id: crypto.randomUUID(),
    agentId,
    content: `📍 Current focus: ${status}`,
    type: 'status',
    position: 'top',
    priority: 'high',
    createdAt: Date.now(),
    expiresAt: Date.now() + expiresInMs,
  }),

  /**
   * Context about other workers
   */
  workContext: (agentId: string, otherWorkers: string[]): Sticky => ({
    id: crypto.randomUUID(),
    agentId,
    content: `🤝 Other active workers: ${otherWorkers.join(', ')}`,
    type: 'context',
    position: 'bottom',
    priority: 'low',
    createdAt: Date.now(),
  }),

  /**
   * Temporary reminder
   */
  temporary: (agentId: string, reminder: string): Sticky => ({
    id: crypto.randomUUID(),
    agentId,
    content: `📝 ${reminder}`,
    type: 'temporary',
    position: 'both',
    priority: 'high',
    createdAt: Date.now(),
    removeAfterUse: true, // Auto-remove after next message
  }),

  /**
   * Warning about approaching limits
   */
  warning: (agentId: string, warning: string): Sticky => ({
    id: crypto.randomUUID(),
    agentId,
    content: `⚠️ ${warning}`,
    type: 'warning',
    position: 'both', // Critical! Show at top AND bottom
    priority: 'critical',
    createdAt: Date.now(),
  }),
};

/**
 * Sandwich theory explanation:
 *
 * Research shows LLMs pay most attention to:
 * 1. START of context (primacy effect)
 * 2. END of context (recency effect)
 * 3. Middle gets lost (especially in long contexts)
 *
 * Therefore:
 * - Critical info: position = 'both' (start AND end)
 * - Important setup: position = 'top' (context setting)
 * - Final reminders: position = 'bottom' (before response)
 * - Medium priority: position = 'top' OR 'bottom' (not both)
 */
