import type { Message, DeclarativeMessage } from './messages.js';
import type { CoordinationPattern, MemorySearchOptions } from './memory.js';

/**
 * Transport abstraction for message delivery between agents. Decouples
 * coordination logic from the network layer so the same orchestration
 * code works across in-memory, BroadcastChannel, WebSocket, or MCP backends.
 */
export interface ITransport {
  /**
   * Send direct message to specific agent
   */
  send(from: string, to: string, message: Message): Promise<void>;

  /**
   * Publish message to channel (broadcast to all members)
   */
  publish(channel: string, message: Message): Promise<void>;

  /**
   * Subscribe to messages for specific agent
   */
  subscribe(agentId: string, handler: (message: Message) => void | Promise<void>): Promise<void>;

  /**
   * Unsubscribe from messages
   */
  unsubscribe(agentId: string): Promise<void>;

  /**
   * Disconnect agent from transport
   */
  disconnect(agentId: string): Promise<void>;

  /**
   * Get list of connected agents
   */
  getConnected(): Promise<string[]>;
}

/**
 * Handler that processes structured messages without invoking an LLM.
 * Implementations react to telemetry/threshold/coordination messages
 * using pure logic, saving token budget for actual content work.
 */
export interface IDeclarativeHandler {
  /**
   * Check if this handler can process the message without LLM
   */
  canHandle(message: DeclarativeMessage): boolean;

  /**
   * Handle message declaratively (no LLM call)
   * May return a response message or void
   */
  handle(message: DeclarativeMessage): Promise<void | DeclarativeMessage>;
}

/**
 * Persistent store for coordination patterns (successful multi-agent strategies).
 * Enables learning from past orchestrations so future tasks can reuse
 * proven approaches via semantic search.
 */
export interface ICoordinationMemory {
  /**
   * Store coordination pattern
   */
  store(pattern: CoordinationPattern): Promise<string>;

  /**
   * Search for similar patterns
   */
  search(query: string, options?: MemorySearchOptions): Promise<CoordinationPattern[]>;

  /**
   * Get pattern by ID
   */
  get(id: string): Promise<CoordinationPattern | null>;

  /**
   * Update existing pattern
   */
  update(id: string, updates: Partial<CoordinationPattern>): Promise<void>;

  /**
   * Delete pattern
   */
  delete(id: string): Promise<void>;
}

/**
 * Converts universal HiveTool definitions into a specific LLM SDK format.
 * This allows tools to be authored once and deployed across OpenAI,
 * Anthropic, and other providers without duplication.
 */
export interface IToolAdapter<TFrameworkTool = unknown> {
  /**
   * Convert hive tools to framework-specific format
   */
  adapt(hiveTools: HiveTool[]): TFrameworkTool[];

  /**
   * Convert framework result back to hive format (optional)
   */
  adaptResult?(frameworkResult: unknown): HiveToolResult;
}

/**
 * Provider-agnostic tool definition. Adapters convert this to
 * OpenAI function-calling format, Anthropic tool_use, or others.
 * The handler is the actual implementation invoked on tool_use.
 */
export interface HiveTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: unknown) => Promise<HiveToolResult>;
  metadata?: ToolMetadata;
}

/**
 * Optional annotations enabling tool discovery by category/tag and
 * cost-aware tool selection (e.g., preferring low-cost tools first).
 */
export interface ToolMetadata {
  tags?: string[]; // e.g., ['filesystem', 'read']
  category?: string; // e.g., 'file-operations', 'web', 'shell'
  cost?: 'low' | 'medium' | 'high'; // Computational cost
  dangerous?: boolean; // Requires extra confirmation
  estimatedTokens?: number; // Avg tokens to describe this tool
  version?: string;
  deprecated?: boolean;
  [key: string]: unknown;
}

/**
 * Standard response envelope returned by all tool handlers.
 * Consumers branch on `success` to handle results vs errors uniformly.
 */
export interface HiveToolResult {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Supported transport backends. 'auto' selects the best option for
 * the current environment (BroadcastChannel in browser, in-memory in Node).
 */
export type TransportType = 'in-memory' | 'broadcast' | 'websocket' | 'http' | 'stdio-mcp' | 'auto';
