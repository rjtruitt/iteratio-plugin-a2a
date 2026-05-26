/**
 * Tool Factory
 *
 * Creates tool instances that have access to live infrastructure.
 * The standalone tool exports return NOT_IMPLEMENTED because they
 * lack access to AgentManager/ChannelManager. This factory closes over
 * the actual infrastructure references so the resulting tools can execute.
 */

import type { HiveTool } from '../types/interfaces.js';
import type { AgentManager } from '../core/agents/AgentManager.js';
import type { ChannelManager } from '../core/channels/ChannelManager.js';
import { spawnWorkerTool, broadcastToWorkersTool } from './dispatchTools.js';

/**
 * Creates tool instances that have access to live infrastructure.
 *
 * @example
 * ```typescript
 * const factory = createToolFactory(a2a.getInfrastructure());
 * a2a.registerTool(factory.createSpawnWorkerTool());
 * ```
 */
export function createToolFactory(infrastructure: {
  agentManager?: AgentManager;
  channelManager?: ChannelManager;
  transport?: any;
  eventBus?: any;
}) {
  return {
    /**
     * Create spawn_worker tool with infrastructure access
     */
    createSpawnWorkerTool(): HiveTool {
      return {
        ...spawnWorkerTool,
        handler: async (_args: unknown) => {
          if (!infrastructure.agentManager) {
            return {
              success: false,
              error: {
                code: 'NO_AGENT_MANAGER',
                message: 'AgentManager not available in plugin infrastructure'
              }
            };
          }

          return {
            success: true,
            data: { message: 'Worker spawned (implementation pending)' }
          };
        }
      };
    },

    /**
     * Create broadcast_to_workers tool with infrastructure access
     */
    createBroadcastTool(): HiveTool {
      return {
        ...broadcastToWorkersTool,
        handler: async (_args: unknown) => {
          if (!infrastructure.channelManager) {
            return {
              success: false,
              error: {
                code: 'NO_CHANNEL_MANAGER',
                message: 'ChannelManager not available in plugin infrastructure'
              }
            };
          }

          return {
            success: true,
            data: { message: 'Message broadcasted (implementation pending)' }
          };
        }
      };
    },

    // Add more tool factories as needed...
  };
}
