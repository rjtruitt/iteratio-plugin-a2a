/**
 * Coordination pattern stored in vector memory.
 * Records a multi-agent strategy and its outcome for future retrieval.
 */
export interface CoordinationPattern {
  id: string;
  scenario: string;
  approach: string;
  outcome: 'success' | 'failure' | 'partial';
  metadata: {
    workersSpawned?: number;
    tokensUsed?: number;
    durationMs?: number;
    tags?: string[];
    timestamp: number;
    [key: string]: unknown;
  };
}

/**
 * Options for querying coordination memory. Supports both
 * structured filtering and vector-similarity-style top-K retrieval.
 */
export interface MemorySearchOptions {
  /** Maximum number of results to return */
  limit?: number;
  topK?: number;
  /** Filter by outcome type */
  outcome?: 'success' | 'failure' | 'partial';
  /** Require matching tags */
  tags?: string[];
  /** Only patterns recorded after this timestamp */
  after?: number;
  /** Only patterns recorded before this timestamp */
  before?: number;
  filters?: {
    scenario?: string;
    outcome?: 'success' | 'failure' | 'partial';
    tags?: string[];
    [key: string]: unknown;
  };
  boostRecent?: boolean;
  boostSuccessful?: boolean;
}
