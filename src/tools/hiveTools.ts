/**
 * Hive-Style Tools (Channel Management)
 *
 * Tools for creating and joining communication channels.
 * Also provides tool collection exports for easy import.
 */

import type { HiveTool, HiveToolResult } from '../types/interfaces.js';
import {
  spawnWorkerTool,
  broadcastToWorkersTool,
  sendMessageTool,
  queryWorkerStatusTool,
  aggregateResultsTool
} from './dispatchTools.js';

// ============================================
// Hive-Style Tools (Channel Management)
// ============================================

/**
 * CreateChannelTool - Create a new communication channel
 *
 * Hive-style tool for creating channels where agents can coordinate.
 *
 * @example
 * ```typescript
 * {
 *   "name": "create_channel",
 *   "arguments": {
 *     "name": "#security-review-pr-456",
 *     "topic": "Review security issues in PR #456"
 *   }
 * }
 * ```
 */
export const createChannelTool: HiveTool = {
  name: 'create_channel',
  description: 'Create a new communication channel for agent coordination',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Channel name (must start with #)'
      },
      topic: {
        type: 'string',
        description: 'Initial channel topic description'
      }
    },
    required: ['name']
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
          code: 'CREATE_CHANNEL_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  },
  metadata: {
    category: 'channel-management',
    tags: ['hive', 'channel', 'create', 'coordination'],
    cost: 'low',
    dangerous: false
  }
};

/**
 * JoinChannelTool - Join an existing channel
 *
 * Join a channel to receive messages and participate in coordination.
 *
 * @example
 * ```typescript
 * {
 *   "name": "join_channel",
 *   "arguments": {
 *     "channel": "#security-review-pr-456"
 *   }
 * }
 * ```
 */
export const joinChannelTool: HiveTool = {
  name: 'join_channel',
  description: 'Join an existing communication channel',
  parameters: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel name to join (e.g., "#security-review")'
      }
    },
    required: ['channel']
  },
  handler: async (_args: unknown): Promise<HiveToolResult> => {
    try {
      return {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Tool handler needs ChannelManager and agent context. Register via plugin after initialization.'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'JOIN_CHANNEL_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  },
  metadata: {
    category: 'channel-management',
    tags: ['hive', 'channel', 'join', 'coordination'],
    cost: 'low',
    dangerous: false
  }
};

// ============================================
// Tool Collections for Easy Import
// ============================================

/**
 * All dispatch-style tools
 */
export const dispatchTools: HiveTool[] = [
  spawnWorkerTool,
  broadcastToWorkersTool,
  sendMessageTool,
  queryWorkerStatusTool,
  aggregateResultsTool
];

/**
 * All hive-style tools
 */
export const hiveTools: HiveTool[] = [
  createChannelTool,
  joinChannelTool,
  broadcastToWorkersTool,
  sendMessageTool
];

/**
 * All built-in tools
 */
export const allTools: HiveTool[] = [
  ...dispatchTools,
  createChannelTool,
  joinChannelTool
];
