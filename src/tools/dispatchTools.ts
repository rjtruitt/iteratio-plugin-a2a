/**
 * Dispatch-Style Tools (Worker Management)
 *
 * Tools for spawning, querying, and aggregating worker agents.
 */

import type { HiveTool, HiveToolResult } from '../types/interfaces.js';
import { AgentRegistry } from '../core/agents/AgentRegistry.js';

// Re-export aggregate tool from its own module
export { aggregateResultsTool } from './aggregateResultsTool.js';

/**
 * SpawnWorkerTool - Spawn a new worker agent
 *
 * Dispatch-style tool for dynamically creating child workers.
 * Workers are independent and report back to orchestrator.
 *
 * @example
 * ```typescript
 * // Agent calls this tool:
 * {
 *   "name": "spawn_worker",
 *   "arguments": {
 *     "templateId": "code-reviewer",
 *     "name": "Security Reviewer",
 *     "initialWork": "Review auth.ts for security issues"
 *   }
 * }
 * ```
 */
export const spawnWorkerTool: HiveTool = {
  name: 'spawn_worker',
  description: 'Spawn a new worker agent from a template to handle a specific task',
  parameters: {
    type: 'object',
    properties: {
      templateId: {
        type: 'string',
        description: 'ID of the agent template to spawn from (e.g., "code-reviewer", "log-analyzer")'
      },
      name: {
        type: 'string',
        description: 'Human-readable name for this worker instance'
      },
      initialWork: {
        type: 'string',
        description: 'Initial work assignment for the worker'
      },
      metadata: {
        type: 'object',
        description: 'Additional metadata to attach to the worker'
      }
    },
    required: ['templateId', 'name', 'initialWork']
  },
  handler: async (_args: unknown): Promise<HiveToolResult> => {
    try {
      return {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Tool handler needs AgentManager instance. Register this tool via plugin.registerTool() after initialization.'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SPAWN_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  },
  metadata: {
    category: 'worker-management',
    tags: ['dispatch', 'spawn', 'worker', 'coordination'],
    cost: 'low',
    dangerous: false
  }
};

/**
 * BroadcastToWorkersTool - Send message to all active workers
 *
 * Broadcast a message to all workers managed by this orchestrator.
 * Workers can respond asynchronously.
 *
 * @example
 * ```typescript
 * {
 *   "name": "broadcast_to_workers",
 *   "arguments": {
 *     "message": "Status update: Found critical security issue",
 *     "channel": "#code-review-123"
 *   }
 * }
 * ```
 */
export const broadcastToWorkersTool: HiveTool = {
  name: 'broadcast_to_workers',
  description: 'Broadcast a message to all active workers in a channel or globally',
  parameters: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Message content to broadcast'
      },
      channel: {
        type: 'string',
        description: 'Optional channel ID (e.g., "#code-review-123"). If omitted, broadcasts globally.'
      },
      priority: {
        type: 'string',
        enum: ['low', 'normal', 'high', 'urgent'],
        description: 'Message priority level'
      }
    },
    required: ['message']
  },
  handler: async (_args: unknown): Promise<HiveToolResult> => {
    try {
      return {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Tool handler needs ChannelManager instance. Register via plugin after initialization.'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'BROADCAST_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  },
  metadata: {
    category: 'communication',
    tags: ['broadcast', 'message', 'workers', 'coordination'],
    cost: 'low',
    dangerous: false
  }
};

/**
 * SendMessageTool - Send direct message to specific agent
 *
 * Send a direct message to a specific agent by ID.
 * Useful for targeted communication vs broadcasting.
 *
 * @example
 * ```typescript
 * {
 *   "name": "send_message",
 *   "arguments": {
 *     "to": "worker-security-123",
 *     "message": "Focus on authentication vulnerabilities",
 *     "expectResponse": true
 *   }
 * }
 * ```
 */
export const sendMessageTool: HiveTool = {
  name: 'send_message',
  description: 'Send a direct message to a specific agent',
  parameters: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description: 'Agent ID to send message to'
      },
      message: {
        type: 'string',
        description: 'Message content'
      },
      expectResponse: {
        type: 'boolean',
        description: 'Whether to expect a response from the agent'
      },
      timeoutMs: {
        type: 'number',
        description: 'Timeout in milliseconds if expecting response (default: 30000)'
      }
    },
    required: ['to', 'message']
  },
  handler: async (_args: unknown): Promise<HiveToolResult> => {
    try {
      return {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Tool handler needs ITransport instance. Register via plugin after initialization.'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEND_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  },
  metadata: {
    category: 'communication',
    tags: ['message', 'direct', 'agent', 'coordination'],
    cost: 'low',
    dangerous: false
  }
};

/**
 * QueryWorkerStatusTool - Query status of workers
 *
 * Get current status of one or all workers.
 * Returns worker state, progress, and results.
 *
 * @example
 * ```typescript
 * {
 *   "name": "query_worker_status",
 *   "arguments": {
 *     "workerId": "worker-123"  // Optional - omit to get all workers
 *   }
 * }
 * ```
 */
export const queryWorkerStatusTool: HiveTool = {
  name: 'query_worker_status',
  description: 'Query the status of one or all active workers',
  parameters: {
    type: 'object',
    properties: {
      workerId: {
        type: 'string',
        description: 'Optional worker ID. If omitted, returns status of all workers.'
      },
      includeMetrics: {
        type: 'boolean',
        description: 'Include detailed metrics (tokens, cost, etc.)'
      }
    }
  },
  handler: async (args: unknown): Promise<HiveToolResult> => {
    try {
      const { workerId, includeMetrics = false } = args as {
        workerId?: string;
        includeMetrics?: boolean;
      };

      // Query from AgentRegistry
      if (workerId) {
        const agent = AgentRegistry.get(workerId);
        if (!agent) {
          return {
            success: false,
            error: {
              code: 'WORKER_NOT_FOUND',
              message: `Worker not found: ${workerId}`
            }
          };
        }

        return {
          success: true,
          data: {
            worker: agent,
            metrics: includeMetrics ? AgentRegistry.getMetrics() : undefined
          }
        };
      } else {
        // Get all workers
        const allAgents = AgentRegistry.getAll();
        const workers = allAgents.filter(a => a.role === 'worker');

        return {
          success: true,
          data: {
            workers,
            count: workers.length,
            metrics: includeMetrics ? AgentRegistry.getMetrics() : undefined
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  },
  metadata: {
    category: 'monitoring',
    tags: ['status', 'query', 'worker', 'monitoring'],
    cost: 'low',
    dangerous: false
  }
};

