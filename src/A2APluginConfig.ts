/**
 * Configuration for the A2A plugin. Controls which coordination patterns,
 * transport backend, and infrastructure components are activated.
 */
export interface A2APluginConfig {
  /**
   * Coordination pattern: 'dispatch' | 'hive' | 'both'
   */
  pattern?: 'dispatch' | 'hive' | 'both';

  /**
   * Transport type for agent communication (string shorthand or object config)
   */
  transport?: string | {
    type: 'in-memory' | 'broadcast' | 'websocket' | 'http' | 'stdio-mcp' | 'auto';
    config?: Record<string, unknown>;
  };

  /**
   * Agent manager configuration
   */
  agentManager?: {
    maxAgents?: number;
    autoRegister?: boolean;
  };

  /**
   * Channel manager configuration
   */
  channelManager?: {
    maxChannels?: number;
  };

  /**
   * Enable event bus for lifecycle events
   */
  enableEventBus?: boolean;

  /**
   * Enable metrics collection
   */
  enableMetrics?: boolean;
}
