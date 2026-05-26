/**
 * Lightweight status board for work discovery without a vector store.
 *
 * Each agent maintains a compact status line (~100 chars) that can be cheaply
 * injected into other agents' contexts. This enables keyword-based overlap
 * detection at a fraction of the token cost of full work announcements.
 */

/**
 * Compact status payload injected into LLM context. Persists across turns
 * without requiring re-transmission of full work descriptions.
 */
export interface AgentStickyStatus {
  agentId: string;
  orchestratorId: string;

  // Compact status line (max 100 chars to save tokens)
  statusLine: string; // e.g., "Analyzing /src/auth for security issues"

  // Structured data for matching
  workType: string;
  primaryResource?: string; // Main file/topic/resource
  keywords: string[]; // For keyword matching without vector store

  // Timing
  since: number; // When they started this work
  estimatedUntil?: number;

  // State
  state: 'idle' | 'active' | 'blocked' | 'completed';
}

/**
 * Shared board visible to all orchestrators, analogous to IRC /who.
 * Enables cross-orchestrator awareness at minimal token cost by exposing
 * compact status summaries rather than full conversation histories.
 */
export interface IStatusBoard {
  /**
   * Set agent status (declarative - zero tokens!)
   */
  setStatus(status: AgentStickyStatus): Promise<void>;

  /**
   * Get agent status
   */
  getStatus(agentId: string): Promise<AgentStickyStatus | null>;

  /**
   * Get all active statuses (for context injection)
   */
  getActiveStatuses(options?: {
    orchestratorId?: string; // Filter by orchestrator
    maxCount?: number; // Limit for token budget
    sortBy?: 'recent' | 'relevance';
  }): Promise<AgentStickyStatus[]>;

  /**
   * Search statuses by keyword (fallback when no vector store)
   */
  searchByKeyword(keyword: string): Promise<AgentStickyStatus[]>;

  /**
   * Get compact status summary for LLM injection
   * Returns formatted string ready to inject into context
   */
  getStatusSummary(options?: {
    maxTokens?: number; // Budget for status board
    excludeAgentId?: string; // Don't show my own status
  }): Promise<string>;

  /**
   * Clear status when work done
   */
  clearStatus(agentId: string): Promise<void>;
}

/**
 * Status update frequency
 * Agents should update their status when work changes significantly
 */
export type StatusUpdateTrigger =
  | 'work-started' // Started new work
  | 'resource-changed' // Switched to different file/topic
  | 'blocked' // Waiting for something
  | 'work-completed'; // Finished

/**
 * Compact status format for LLM context
 */
export interface StatusBoardSummary {
  // Compact format that fits in small token budget
  summary: string; // Multi-line string for LLM
  tokenCount: number;
  agentCount: number;
  lastUpdated: number;
}

/**
 * Example status board output for LLM:
 *
 * === ACTIVE WORKERS ===
 * worker-1 (orch-A): Analyzing /src/auth [security, authentication]
 * worker-5 (orch-C): Researching hanta virus [medical, research]
 * worker-10 (orch-F): Fixing XSS in /src/auth/login.ts [security, bug-fix]
 * === 3 ACTIVE / 12 TOTAL ===
 *
 * Token cost: ~100 tokens (much less than full work announcements!)
 */
