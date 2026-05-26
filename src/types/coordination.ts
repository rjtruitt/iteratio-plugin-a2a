import type { AgentIdentity, SpawnOptions } from './agent.js';
import type { Channel, AgentSubscriptionMode } from './channels.js';
import type { CoordinationPattern } from './memory.js';

/**
 * Primary API for controlling agents at runtime. Consumers implement
 * this to wire coordination verbs (spawn/pause/cancel) to their
 * specific agent loop implementation.
 */
export interface ICoordinator {
  /**
   * Spawn a new agent (dynamic or template-based)
   */
  spawn(options: SpawnOptions): Promise<string>;

  /**
   * Send direct message to agent
   */
  message(from: string, to: string, content: string): Promise<void>;

  /**
   * Broadcast message to channel
   */
  broadcast(channel: string, from: string, content: string): Promise<void>;

  /**
   * Ask agent a question and wait for response
   */
  ask(from: string, to: string, question: string, timeoutMs?: number): Promise<string>;

  /**
   * Pause agent execution
   */
  pause(agentId: string): Promise<void>;

  /**
   * Resume paused agent
   */
  resume(agentId: string): Promise<void>;

  /**
   * Cancel agent execution
   */
  cancel(agentId: string, reason?: string): Promise<void>;

  /**
   * Upgrade agent to different model
   */
  upgrade(agentId: string, newModel: string): Promise<void>;

  /**
   * Get agent status
   */
  getStatus(agentId: string): Promise<AgentIdentity | null>;

  /**
   * List all active agents
   */
  listActive(): Promise<AgentIdentity[]>;

  /**
   * Join channel
   */
  join(agentId: string, channel: string): Promise<void>;

  /**
   * Leave channel
   */
  part(agentId: string, channel: string, reason?: string): Promise<void>;

  /**
   * Set subscription mode for agent
   */
  setSubscriptionMode(agentId: string, channel: string, mode: AgentSubscriptionMode): Promise<void>;

  /**
   * Get channel info
   */
  getChannel(name: string): Promise<Channel | undefined>;

  /**
   * Query vector memory for similar scenarios
   */
  getSimilarScenarios?(query: string, topK?: number): Promise<CoordinationPattern[]>;

  /**
   * Record coordination pattern to memory
   */
  recordPattern?(pattern: CoordinationPattern): Promise<void>;
}

/**
 * Extension for fan-out patterns where an orchestrator spawns N workers
 * in parallel and needs to wait/merge their results. Handles the common
 * "scatter-gather" lifecycle.
 */
export interface IMultiWorkerCoordinator {
  /**
   * Spawn multiple workers in parallel
   */
  spawnWorkers(requests: SpawnOptions[]): Promise<string[]>;

  /**
   * Wait for all workers to complete
   */
  waitForCompletion(workerIds: string[], timeoutMs?: number): Promise<WorkerResult[]>;

  /**
   * Merge worker results with compression
   */
  mergeWorkerResults(
    orchestratorStrandId: string,
    workerResults: WorkerResult[],
    options: MergeWorkerOptions
  ): Promise<string>;

  /**
   * Get aggregated status of all workers
   */
  getWorkerSummary(workerIds: string[]): Promise<WorkerSummary>;

  /**
   * Cancel all workers
   */
  cancelAll(workerIds: string[], reason?: string): Promise<void>;
}

/**
 * Final outcome from a single worker including cost/token accounting.
 * Used by the orchestrator to decide whether to retry or merge results.
 */
export interface WorkerResult {
  workerId: string;
  strandId: string;
  status: 'completed' | 'failed' | 'cancelled' | 'timeout';
  result?: unknown;
  error?: {
    code: string;
    message: string;
  };
  stats: {
    messageCount: number;
    tokensUsed: number;
    durationMs: number;
    costUsd: number;
  };
}

/**
 * Controls how multiple worker strands are compressed back into the
 * orchestrator's context window. Summarize-and-compress is the only
 * strategy currently supported.
 */
export interface MergeWorkerOptions {
  strategy: 'summarize-and-compress';
  maxTokensPerWorker: number;
  model?: string; // Cheap model for summarization (e.g., 'claude-haiku')
  includeMetadata?: boolean;
  preserveOriginalStrands?: boolean; // Keep original worker strands after merge
}

/**
 * Summary of multiple workers
 */
export interface WorkerSummary {
  totalWorkers: number;
  completed: number;
  failed: number;
  running: number;
  cancelled: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  totalDurationMs: number;
  avgTokensPerWorker: number;
  avgCostPerWorker: number;
}

/**
 * Manages conversation branches for exploratory work. Allows agents to
 * fork context, try different approaches, and merge the best result
 * back without polluting the main conversation.
 */
export interface IStrandBrancher {
  /**
   * Create new conversation branch from current point
   */
  branch(parentStrandId: string, branchName: string, reason?: string): Promise<string>;

  /**
   * Merge branch back to parent with strategy
   */
  mergeBranch(
    branchStrandId: string,
    targetStrandId: string,
    strategy: 'keep-branch' | 'keep-parent' | 'merge-both' | 'summarize'
  ): Promise<void>;

  /**
   * List all branches of a strand
   */
  listBranches(strandId: string): Promise<BranchInfo[]>;

  /**
   * Switch active branch
   */
  switchBranch(fromStrandId: string, toStrandId: string): Promise<void>;

  /**
   * Delete branch
   */
  deleteBranch(branchStrandId: string): Promise<void>;
}

/**
 * Branch information
 */
export interface BranchInfo {
  strandId: string;
  branchName: string;
  parentStrandId?: string;
  createdAt: number;
  messageCount: number;
  reason?: string;
  isActive: boolean;
}

/**
 * Typed event subscription interface for coordination lifecycle events.
 * Enables external monitoring, logging, and reactive behaviors.
 */
export interface ICoordinationEvents {
  /**
   * Subscribe to agent events
   */
  on(event: CoordinationEvent, handler: (data: unknown) => void): void;

  /**
   * Unsubscribe from events
   */
  off(event: CoordinationEvent, handler: (data: unknown) => void): void;

  /**
   * Emit event
   */
  emit(event: CoordinationEvent, data: unknown): void;

  /**
   * Subscribe once
   */
  once(event: CoordinationEvent, handler: (data: unknown) => void): void;
}

/**
 * All lifecycle event names that can be emitted during coordination.
 * Used as the discriminant for event subscriptions.
 */
export type CoordinationEvent =
  | 'agent.spawned'
  | 'agent.completed'
  | 'agent.failed'
  | 'agent.paused'
  | 'agent.resumed'
  | 'agent.cancelled'
  | 'agent.upgraded'
  | 'channel.created'
  | 'channel.deleted'
  | 'channel.joined'
  | 'channel.parted'
  | 'message.sent'
  | 'message.broadcast'
  | 'trigger.emitted'
  | 'strand.branched'
  | 'strand.merged'
  | 'workers.completed';
