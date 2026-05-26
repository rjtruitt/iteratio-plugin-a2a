import type { Message } from './messages.js';

/**
 * Persistence layer for conversation strands (branches of agent history).
 * Supports branching for exploratory work and merging for result aggregation,
 * enabling tree-shaped conversations rather than linear chat.
 */
export interface IConversationStorage {
  /**
   * Save conversation messages for a strand
   */
  save(strandId: string, messages: Message[]): Promise<void>;

  /**
   * Load conversation history for a strand
   */
  load(strandId: string): Promise<Message[]>;

  /**
   * Delete strand history
   */
  delete(strandId: string): Promise<void>;

  /**
   * List all strand IDs
   */
  list(): Promise<string[]>;

  /**
   * Get strand metadata
   */
  getMetadata(strandId: string): Promise<StrandMetadata | null>;

  /**
   * Branch conversation (copy parent history to child)
   */
  branch(parentId: string, childId: string, reason?: string): Promise<void>;

  /**
   * Merge single strand into target
   */
  merge(sourceId: string, targetId: string, options: MergeOptions): Promise<void>;

  /**
   * Merge multiple worker strands into orchestrator strand (with compression)
   */
  mergeMultiple(
    targetStrandId: string,
    sourceStrandIds: string[],
    options: MergeOptions
  ): Promise<MergeSummary>;
}

/**
 * Bookkeeping for a single conversation strand (branch). Tracks lineage,
 * size, and merge history for efficient retrieval and garbage collection.
 */
export interface StrandMetadata {
  id: string;
  parentId?: string;
  createdAt: number;
  lastUpdatedAt: number;
  messageCount: number;
  tokenCount?: number;
  branchReason?: string;
  mergedFrom?: string[];
  tags?: string[];
}

/**
 * How to combine multiple strands. Trade-off between token cost (summarize)
 * and information fidelity (append/interleave).
 */
export type MergeStrategy =
  | 'append' // Add source messages to end of target
  | 'interleave' // Mix messages by timestamp
  | 'summarize' // Use LLM to create summary (token-efficient)
  | 'choose-best' // Keep only the better conversation
  | 'custom'; // User-provided merge function

/**
 * Full configuration for a merge operation. Strategy selection plus
 * strategy-specific parameters (summarization model, evaluation criteria, etc).
 */
export interface MergeOptions {
  strategy: MergeStrategy;

  // For 'summarize' strategy
  maxTokensPerStrand?: number;
  summarizationModel?: string; // e.g., 'claude-haiku' (cheap model)
  summarizationPrompt?: string;

  // For 'choose-best' strategy
  evaluationCriteria?: {
    preferShorter?: boolean;
    preferMoreRecent?: boolean;
    preferLowerCost?: boolean;
  };

  // For parallel worker merge
  workerContext?: {
    orchestratorId: string;
    taskDescription?: string;
  };

  // Custom merge logic
  customMerger?: (strands: StrandData[]) => Promise<Message[]>;

  // Preserve metadata from source strands
  preserveMetadata?: boolean;
}

/**
 * Strand data for merging
 */
export interface StrandData {
  strandId: string;
  messages: Message[];
  metadata: StrandMetadata;
}

/**
 * Post-merge report showing compression ratio and token savings.
 * Useful for cost monitoring and deciding when to adjust merge strategies.
 */
export interface MergeSummary {
  targetStrandId: string;
  mergedStrandIds: string[];
  strategy: MergeStrategy;
  messagesBeforeMerge: number;
  messagesAfterMerge: number;
  tokensBeforeMerge?: number;
  tokensAfterMerge?: number;
  tokensSaved?: number;
  compressionRatio?: number; // e.g., 0.95 = 95% compression
  summarizationCost?: number;
  mergedAt: number;
}
