/**
 * Common envelope fields shared by all message types. Every message
 * has a unique ID, sender, and timestamp for ordering and deduplication.
 */
export interface BaseMessage {
  id: string;
  from: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Zero-token messages handled by the agent loop's declarative layer without
 * invoking an LLM. These carry structured telemetry, health signals, and
 * coordination commands that would waste tokens if routed through the model.
 */
export namespace DeclarativeMessages {
  // ===== Execution State =====

  export interface ExecutionState extends BaseMessage {
    type: 'execution.state';
    status: 'idle' | 'running' | 'waiting' | 'paused' | 'completed' | 'failed';
    startedAt?: number;
    lastActivityAt: number;
  }

  export interface ExecutionStats extends BaseMessage {
    type: 'execution.stats';
    toolCallCount: number;
    llmCallCount: number;
    tokensUsed: { input: number; output: number };
    elapsedMs: number;
    memoryUsedMb: number;
    costUsd: number;
  }

  export interface ExecutionProgress extends BaseMessage {
    type: 'execution.progress';
    percent: number;
    currentStep?: string;
    stepsCompleted: number;
    stepsTotal: number;
  }

  // ===== Health Monitoring =====

  export interface Heartbeat extends BaseMessage {
    type: 'health.heartbeat';
    healthy: boolean;
  }

  export interface HealthMetrics extends BaseMessage {
    type: 'health.metrics';
    cpuPercent?: number;
    memoryMb: number;
    idleTimeMs: number;
    loopDetected?: boolean;
  }

  // ===== Resource Limits =====

  export interface BudgetStatus extends BaseMessage {
    type: 'budget.status';
    tokensUsed: number;
    tokensLimit: number;
    costUsd: number;
    costLimitUsd: number;
    isExceeded: boolean;
  }

  export interface RateLimitStatus extends BaseMessage {
    type: 'ratelimit.status';
    requestsInWindow: number;
    windowResetAt: number;
    isThrottled: boolean;
  }

  // ===== Context Management =====

  export interface ContextUsage extends BaseMessage {
    type: 'context.usage';
    tokensUsed: number;
    tokensAvailable: number;
    percentFull: number;
    needsCompression: boolean;
  }

  export interface ContextCheckpoint extends BaseMessage {
    type: 'context.checkpoint';
    checkpointId: string;
    messageCount: number;
    canRestore: boolean;
  }

  // ===== Task Completion =====

  export interface TaskComplete extends BaseMessage {
    type: 'task.complete';
    result: unknown;
    success: boolean;
    stats: ExecutionStats;
  }

  export interface TaskError extends BaseMessage {
    type: 'task.error';
    code: string;
    retryable: boolean;
    retryCount: number;
    maxRetries: number;
    errorMessage?: string;
  }

  // ===== Channel Metadata =====

  export interface ChannelInfo extends BaseMessage {
    type: 'channel.info';
    channel: string;
    memberCount: number;
    activeCount: number;
    messagesInWindow: number;
    topicLastUpdated: number;
  }
}

/**
 * Reactive messages emitted when a monitored metric crosses a threshold.
 * Handlers inspect these to decide whether to warn, pause, or escalate.
 */
export namespace TriggerMessages {
  export interface ToolCountThreshold extends BaseMessage {
    type: 'trigger.toolcount';
    current: number;
    threshold: number;
    exceeded: boolean;
    action?: 'warn' | 'pause' | 'escalate';
  }

  export interface CostThreshold extends BaseMessage {
    type: 'trigger.cost';
    currentUsd: number;
    thresholdUsd: number;
    exceeded: boolean;
    action?: 'warn' | 'pause' | 'cancel';
  }

  export interface DurationThreshold extends BaseMessage {
    type: 'trigger.duration';
    elapsedMs: number;
    thresholdMs: number;
    exceeded: boolean;
    action?: 'warn' | 'nudge' | 'cancel';
  }

  export interface RepetitionDetected extends BaseMessage {
    type: 'trigger.repetition';
    pattern: string;
    count: number;
    threshold: number;
    action?: 'warn' | 'pause' | 'change-strategy';
  }

  export interface ErrorRateThreshold extends BaseMessage {
    type: 'trigger.errorrate';
    errorCount: number;
    totalAttempts: number;
    errorRate: number;
    threshold: number;
    exceeded: boolean;
    action?: 'warn' | 'pause' | 'escalate';
  }

  export interface IdleThreshold extends BaseMessage {
    type: 'trigger.idle';
    idleTimeMs: number;
    thresholdMs: number;
    exceeded: boolean;
    action?: 'nudge' | 'cancel';
  }

  export interface MemoryThreshold extends BaseMessage {
    type: 'trigger.memory';
    memoryMb: number;
    thresholdMb: number;
    exceeded: boolean;
    action?: 'warn' | 'compress' | 'checkpoint';
  }

  export interface LoopDetected extends BaseMessage {
    type: 'trigger.loop';
    pattern: string;
    iterations: number;
    action?: 'pause' | 'change-strategy' | 'escalate';
  }

  export interface ContextThreshold extends BaseMessage {
    type: 'trigger.context';
    percentFull: number;
    threshold: number;
    exceeded: boolean;
    action?: 'compress' | 'checkpoint' | 'warn';
  }
}

/**
 * Explicit coordination command from one agent to another (pause/resume/cancel/etc).
 * Handled declaratively by the receiver's agent loop.
 */
export interface CoordinationRequest extends BaseMessage {
  type: 'coordination.request';
  to: string;
  action: 'pause' | 'resume' | 'cancel' | 'upgrade' | 'retry' | 'checkpoint';
  reason?: string;
}

/**
 * Acknowledgment of a CoordinationRequest, reporting success or failure
 * of the requested action (pause/resume/cancel/etc).
 */
export interface CoordinationResponse extends BaseMessage {
  type: 'coordination.response';
  requestId: string;
  success: boolean;
  action: string;
  error?: { code: string; message: string };
}

/**
 * Natural-language content that must be routed through the LLM for interpretation.
 * Unlike declarative messages, these consume tokens and require model attention.
 */
export interface LLMMessage extends BaseMessage {
  type: 'llm.content';
  to: string;
  content: string;
  requiresResponse?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

/**
 * Discriminated union of all messages that bypass the LLM.
 * Handlers use the `type` field to pattern-match and respond.
 */
export type DeclarativeMessage =
  | DeclarativeMessages.ExecutionState
  | DeclarativeMessages.ExecutionStats
  | DeclarativeMessages.ExecutionProgress
  | DeclarativeMessages.Heartbeat
  | DeclarativeMessages.HealthMetrics
  | DeclarativeMessages.BudgetStatus
  | DeclarativeMessages.RateLimitStatus
  | DeclarativeMessages.ContextUsage
  | DeclarativeMessages.ContextCheckpoint
  | DeclarativeMessages.TaskComplete
  | DeclarativeMessages.TaskError
  | DeclarativeMessages.ChannelInfo
  | TriggerMessages.ToolCountThreshold
  | TriggerMessages.CostThreshold
  | TriggerMessages.DurationThreshold
  | TriggerMessages.RepetitionDetected
  | TriggerMessages.ErrorRateThreshold
  | TriggerMessages.IdleThreshold
  | TriggerMessages.MemoryThreshold
  | TriggerMessages.LoopDetected
  | TriggerMessages.ContextThreshold
  | CoordinationRequest
  | CoordinationResponse;

/**
 * Top-level message union. Transport and handlers accept this type;
 * consumers narrow via the `type` discriminant.
 */
export type Message = DeclarativeMessage | LLMMessage;
