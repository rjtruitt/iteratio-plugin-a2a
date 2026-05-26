/**
 * Work coordination primitives for multi-orchestrator environments.
 *
 * When multiple orchestrators run concurrently, they risk duplicating effort
 * (two workers analyzing the same file) or conflicting on resources. These
 * types enable work announcement, discovery, and resource locking so
 * orchestrators collaborate without explicit coupling.
 */

/**
 * Declarative broadcast of what a worker is doing. Zero token cost since
 * it's handled by the declarative layer. Enables other orchestrators to
 * detect overlap before spawning redundant workers.
 */
export interface WorkAnnouncement {
  workerId: string;
  orchestratorId: string;
  channel: string;

  // What are they working on?
  workType: 'file-analysis' | 'research' | 'code-review' | 'testing' | 'debugging' | string;
  resources: WorkResource[];
  description: string;

  // Status
  status: 'claimed' | 'in-progress' | 'completed' | 'failed';
  startedAt: number;
  estimatedCompletionAt?: number;
  completedAt?: number;

  // For semantic search
  tags?: string[];
  keywords?: string[];
}

/**
 * Work resource (file, topic, endpoint, etc.)
 */
export interface WorkResource {
  type: 'file' | 'directory' | 'topic' | 'endpoint' | 'database' | string;
  identifier: string; // e.g., "/src/auth/login.ts", "hanta virus", "POST /api/users"
  accessMode: 'read' | 'write' | 'exclusive';
}

/**
 * Work discovery query
 */
export interface WorkDiscoveryQuery {
  // Exact resource match
  resource?: WorkResource;

  // Semantic search (requires vector store)
  semanticQuery?: string;
  topK?: number;

  // Filter by status
  status?: ('claimed' | 'in-progress' | 'completed' | 'failed')[];

  // Filter by time
  activeWithinMs?: number; // Only show work from last N ms

  // Filter by orchestrator
  excludeOrchestratorId?: string; // Don't show my own workers
}

/**
 * Work discovery result
 */
export interface WorkDiscoveryResult {
  announcement: WorkAnnouncement;
  similarity?: number; // 0-1 (if semantic search used)
  isExactMatch: boolean;
  recommendation: 'reuse' | 'wait' | 'collaborate' | 'spawn-new';
  reason: string;
}

/**
 * Cross-channel subscription
 * Orchestrator subscribes to results from other channels
 */
export interface CrossChannelSubscription {
  subscriberId: string; // Orchestrator ID
  subscriberChannel: string; // Their channel

  // What to subscribe to
  targetChannels?: string[]; // Specific channels
  resourcePattern?: string; // e.g., "/src/**/*.ts" or "virus*"
  workType?: string;
  tags?: string[];

  // Delivery options
  deliveryMode: 'immediate' | 'on-completion' | 'digest';
  includeInProgress?: boolean; // Get notifications during work, not just completion
}

/**
 * Cross-channel notification
 */
export interface CrossChannelNotification {
  id: string;
  from: {
    orchestratorId: string;
    workerId: string;
    channel: string;
  };
  to: {
    subscriberId: string;
    subscriberChannel: string;
  };

  // What happened
  eventType: 'work-started' | 'work-completed' | 'resource-available';
  announcement: WorkAnnouncement;
  result?: unknown; // If work completed

  timestamp: number;
}

/**
 * Global registry of all active work. Orchestrators query this before
 * spawning workers to avoid duplication, and subscribe for cross-channel
 * notifications when related work completes elsewhere.
 */
export interface IWorkRegistry {
  /**
   * Announce work (declarative - zero tokens!)
   */
  announce(announcement: WorkAnnouncement): Promise<void>;

  /**
   * Update work status (declarative)
   */
  updateStatus(
    workerId: string,
    status: 'in-progress' | 'completed' | 'failed',
    result?: unknown
  ): Promise<void>;

  /**
   * Discover existing work (uses vector store if available)
   */
  discover(query: WorkDiscoveryQuery): Promise<WorkDiscoveryResult[]>;

  /**
   * Check if resource is available (declarative check)
   */
  isResourceAvailable(resource: WorkResource): Promise<{
    available: boolean;
    inUseBy?: string[]; // Worker IDs
    estimatedFreeAt?: number;
  }>;

  /**
   * Subscribe to work from other channels
   */
  subscribe(subscription: CrossChannelSubscription): Promise<string>;

  /**
   * Unsubscribe
   */
  unsubscribe(subscriptionId: string): Promise<void>;

  /**
   * Get all active work (for a specific orchestrator)
   */
  getActiveWork(orchestratorId?: string): Promise<WorkAnnouncement[]>;

  /**
   * Clean up completed/failed work older than N ms
   */
  cleanup(olderThanMs: number): Promise<number>;
}

/**
 * Similarity-based work discovery. Uses vector embeddings when available,
 * falling back to keyword matching. Catches near-duplicates that exact
 * resource matching would miss (e.g., "auth security" vs "login vulnerabilities").
 */
export interface ISemanticWorkMatcher {
  /**
   * Find similar work using vector embeddings
   */
  findSimilar(
    description: string,
    options?: {
      topK?: number;
      minSimilarity?: number;
      excludeOrchestratorId?: string;
    }
  ): Promise<Array<{
    announcement: WorkAnnouncement;
    similarity: number;
  }>>;

  /**
   * Check if work is semantically similar to existing work
   * Returns true if duplicate/very similar work exists
   */
  isDuplicate(
    description: string,
    threshold?: number // Default 0.9
  ): Promise<{
    isDuplicate: boolean;
    existingWork?: WorkAnnouncement;
    similarity?: number;
  }>;

  /**
   * Suggest collaboration opportunities
   * "You're working on X, someone else is working on Y, you should collaborate"
   */
  suggestCollaboration(
    workerId: string,
    myWork: WorkAnnouncement
  ): Promise<Array<{
    otherWork: WorkAnnouncement;
    reason: string;
    collaborationType: 'merge-efforts' | 'share-results' | 'sequential';
  }>>;
}

/**
 * Resource conflict resolution
 */
export interface ResourceConflict {
  resource: WorkResource;
  requestedBy: string; // New worker wanting resource
  inUseBy: string[]; // Current workers using resource
  conflictType: 'read-write' | 'write-write' | 'exclusive';
  resolution: 'wait' | 'share' | 'reject' | 'sequential';
}

/**
 * High-level policy for handling work overlap. Determines whether
 * conflicting work is deduplicated, shared, queued, or parallelized.
 */
export type WorkCoordinationStrategy =
  | 'deduplicate' // Prevent duplicate work
  | 'collaborate' // Multiple workers on similar tasks
  | 'sequential' // Queue work on same resource
  | 'parallel' // Allow parallel work (read-only);
