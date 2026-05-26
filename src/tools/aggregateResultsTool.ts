/**
 * AggregateResultsTool - Aggregate results from multiple workers
 *
 * Collect and aggregate results from multiple workers.
 * Useful for orchestrator to gather worker outputs.
 */

import type { HiveTool, HiveToolResult } from '../types/interfaces.js';
import { AgentRegistry } from '../core/agents/AgentRegistry.js';

/**
 * @example
 * ```typescript
 * {
 *   "name": "aggregate_results",
 *   "arguments": {
 *     "workerIds": ["worker-1", "worker-2", "worker-3"],
 *     "waitForAll": true,
 *     "timeoutMs": 60000
 *   }
 * }
 * ```
 */
export const aggregateResultsTool: HiveTool = {
  name: 'aggregate_results',
  description: 'Aggregate results from multiple workers',
  parameters: {
    type: 'object',
    properties: {
      workerIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of worker IDs to aggregate results from'
      },
      waitForAll: {
        type: 'boolean',
        description: 'Wait for all workers to complete (default: true)'
      },
      timeoutMs: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 60000)'
      },
      includePartial: {
        type: 'boolean',
        description: 'Include partial results if timeout occurs (default: true)'
      }
    },
    required: ['workerIds']
  },
  handler: async (args: unknown): Promise<HiveToolResult> => {
    try {
      const {
        workerIds,
      } = args as {
        workerIds: string[];
        waitForAll?: boolean;
        timeoutMs?: number;
        includePartial?: boolean;
      };

      if (!Array.isArray(workerIds) || workerIds.length === 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_ARGUMENTS',
            message: 'workerIds must be a non-empty array'
          }
        };
      }

      // Collect results from workers
      const results: Array<{
        workerId: string;
        status: string;
        result?: unknown;
        error?: string;
      }> = [];

      for (const workerId of workerIds) {
        const agent = AgentRegistry.get(workerId);
        if (!agent) {
          results.push({
            workerId,
            status: 'not_found',
            error: `Worker not found: ${workerId}`
          });
          continue;
        }

        results.push({
          workerId,
          status: agent.status,
          result: agent.metadata?.result,
          error: agent.metadata?.error as string | undefined
        });
      }

      const completed = results.filter(r => r.status === 'done' || r.status === 'error').length;
      const failed = results.filter(r => r.status === 'error' || r.status === 'not_found').length;

      return {
        success: true,
        data: {
          results,
          summary: {
            total: workerIds.length,
            completed,
            failed,
            pending: workerIds.length - completed
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AGGREGATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  },
  metadata: {
    category: 'coordination',
    tags: ['aggregate', 'results', 'worker', 'orchestration'],
    cost: 'low',
    dangerous: false
  }
};
