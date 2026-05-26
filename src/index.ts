/**
 * iteratio-plugin-a2a
 * Agent-to-agent coordination plugin (formerly hive-orchestrator)
 *
 * Infrastructure-only plugin following MCP pattern:
 * - Provides core infrastructure: AgentRegistry, ChannelManager, MessageBus, Transport
 * - NO built-in tools by default
 * - Users can optionally register tools from 'iteratio-plugin-a2a/tools'
 * - Supports both dispatch-style and hive-style coordination patterns
 */

import type { IPlugin, PluginConfig, TurnContext } from 'iteratio';

// Core infrastructure exports
export { AgentRegistry } from './core/agents/AgentRegistry.js';
export { AgentManager } from './core/agents/AgentManager.js';
export { ChannelManager } from './core/channels/ChannelManager.js';
export { HiveEventBus } from './core/events/HiveEventBus.js';
export { ToolRegistry } from './core/tools/ToolRegistry.js';
export { TransportFactory } from './core/transport/TransportFactory.js';
export { BaseTransport } from './core/transport/BaseTransport.js';
export { InMemoryTransport } from './core/transport/InMemoryTransport.js';
export { BroadcastChannelTransport } from './core/transport/BroadcastChannelTransport.js';
export { HiveOrchestrator } from './core/builder/HiveOrchestrator.js';
export { HiveOrchestratorBuilder } from './core/builder/HiveOrchestratorBuilder.js';
export { DeclarativeHandlerChain } from './core/handlers/DeclarativeHandlerChain.js';
export { BaseDeclarativeHandler } from './core/handlers/BaseDeclarativeHandler.js';
export { ToolCountThresholdHandler } from './core/handlers/ToolCountThresholdHandler.js';
export { BaseCoordinationMemory } from './core/memory/BaseCoordinationMemory.js';
export { InMemoryCoordinationMemory } from './core/memory/InMemoryCoordinationMemory.js';

// Type exports
export * from './types/index.js';

// Tool adapter exports
export { BaseToolAdapter } from './core/tools/BaseToolAdapter.js';
export { AnthropicToolAdapter } from './core/tools/adapters/AnthropicToolAdapter.js';
export { OpenAIToolAdapter } from './core/tools/adapters/OpenAIToolAdapter.js';

// Config export
export type { A2APluginConfig } from './A2APluginConfig.js';

// Import types for plugin API
import type { A2APluginConfig } from './A2APluginConfig.js';
import type { HiveTool } from './types/interfaces.js';
import type { ITransport } from './types/interfaces.js';
import type { AgentManager } from './core/agents/AgentManager.js';
import type { ChannelManager } from './core/channels/ChannelManager.js';
import type { HiveEventBus } from './core/events/HiveEventBus.js';

// ============================================
// Plugin Implementation
// ============================================

/**
 * Infrastructure-only plugin that provides agent-to-agent coordination
 * primitives (transport, registry, channels, events) without imposing
 * any built-in tools. Tools are opt-in via registerTool().
 */
/** Main A2A plugin class enabling agent-to-agent communication and coordination. */
export class A2APlugin implements IPlugin {
  readonly name = 'a2a';
  readonly version = '0.1.0';

  config?: A2APluginConfig;
  agentManager?: AgentManager;
  channelManager?: ChannelManager;
  eventBus?: HiveEventBus;
  transport?: ITransport;
  private capabilities: Map<string, string[]> = new Map();
  private incomingMessages: Array<{ from: string; to: string; content: string }> = [];

  constructor(config?: A2APluginConfig) {
    if (config) {
      this.config = config;
    }
  }

  /**
   * Initialize the A2A plugin
   * Sets up infrastructure but does NOT register any tools by default
   */
  async initialize(container: import("inversify").Container): Promise<void> {
    const config = this.config || {};

    // Create event bus
    if (config.enableEventBus !== false) {
      const { HiveEventBus: EvtBus } = await import('./core/events/HiveEventBus.js');
      this.eventBus = new EvtBus();
    }

    // Create transport
    const { InMemoryTransport } = await import('./core/transport/InMemoryTransport.js');
    this.transport = new InMemoryTransport();

    // Create agent manager
    const { AgentManager: AM } = await import('./core/agents/AgentManager.js');
    this.agentManager = new AM({
      transport: this.transport,
      eventBus: this.eventBus,
      maxAgents: config.agentManager?.maxAgents,
      autoRegister: config.agentManager?.autoRegister
    });

    // Create channel manager
    const { ChannelManager: CM } = await import('./core/channels/ChannelManager.js');
    this.channelManager = new CM({
      transport: this.transport,
      eventBus: this.eventBus,
      maxChannels: config.channelManager?.maxChannels
    });

    // Make infrastructure available in container
    if (container && container.bind) {
      container.bind('AgentManager').toConstantValue(this.agentManager);
      container.bind('ChannelManager').toConstantValue(this.channelManager);
      if (this.eventBus) {
        container.bind('HiveEventBus').toConstantValue(this.eventBus);
      }
      container.bind('ITransport').toConstantValue(this.transport);
    }
  }

  /**
   * Configure the plugin
   * Must be called before initialize
   */
  configure(config: PluginConfig): void {
    this.config = config as A2APluginConfig;
  }

  /**
   * Register a tool with the plugin
   * Users call this to add coordination tools like SpawnWorkerTool
   *
   * @example
   * ```typescript
   * import { spawnWorkerTool } from 'iteratio-plugin-a2a/tools';
   * a2aPlugin.registerTool(spawnWorkerTool);
   * ```
   */
  registerTool(tool: HiveTool): void {
    const { ToolRegistry } = require('./core/tools/ToolRegistry.js');
    ToolRegistry.register(tool);
  }

  /**
   * Get all registered tools
   * Called by iteratio to get available tools
   */
  getTools(): HiveTool[] {
    const { ToolRegistry } = require('./core/tools/ToolRegistry.js');
    return ToolRegistry.getAll();
  }

  /**
   * Register capabilities for an agent
   */
  registerCapabilities(agentId: string, caps: string[]): void {
    this.capabilities.set(agentId, caps);
  }

  /**
   * Get capabilities for an agent
   */
  getCapabilities(agentId: string): string[] {
    return this.capabilities.get(agentId) || [];
  }

  /**
   * Hook: Before agent turn
   * Check for incoming messages from other agents
   */
  async beforeTurn(context: TurnContext): Promise<void> {
    // Initialize incoming messages in state
    if (!context.state) {
      context.state = {};
    }
    context.state.a2aIncoming = [...this.incomingMessages];

    // Inject incoming messages into context messages
    for (const msg of this.incomingMessages) {
      if (context.messages && context.messages.length > 0) {
        context.messages[0].content += `\n[A2A from ${msg.from}]: ${msg.content}`;
      }
    }
    this.incomingMessages = [];
  }

  /**
   * Hook: After agent turn
   * Route outgoing messages to other agents
   */
  async afterTurn(context: TurnContext): Promise<void> {
    if (!context.state) return;
    const outgoing = context.state.a2aOutgoing;
    if (!outgoing || !Array.isArray(outgoing)) return;

    // Dispatch each outgoing message
    for (const msg of outgoing) {
      if (this.transport) {
        const fullMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          from: 'self',
          to: msg.to,
          type: 'a2a-message',
          timestamp: Date.now(),
          content: msg.content,
          ...msg,
        };
        try {
          await this.transport.send('self', msg.to, fullMessage);
        } catch {
          // Agent may not be subscribed - swallow delivery errors
        }
      }
    }

    // Clear the queue
    context.state.a2aOutgoing = [];
  }

  /**
   * Simulate receiving an incoming message (for testing)
   */
  simulateIncoming(msg: { from: string; to: string; content: string }): void {
    this.incomingMessages.push(msg);
  }

  /**
   * Shutdown the plugin
   * Clean up resources
   */
  async shutdown(): Promise<void> {
    // Terminate all managed agents
    if (this.agentManager) {
      await this.agentManager.terminateAll();
    }

    // Clear channels
    if (this.channelManager) {
      this.channelManager.clear();
    }

    // Disconnect transport
    if (this.transport) {
      const connectedAgents = await this.transport.getConnected();
      await Promise.all(connectedAgents.map(id => this.transport!.disconnect(id)));
    }

    // Clear registries
    const { AgentRegistry } = await import('./core/agents/AgentRegistry.js');
    const { ToolRegistry } = await import('./core/tools/ToolRegistry.js');
    AgentRegistry.clear();
    ToolRegistry.clear();
  }

  /**
   * Collect runtime statistics across all infrastructure components.
   * Useful for monitoring agent population and channel usage.
   */
  getStats(): {
    agents: unknown;
    tools: unknown;
    channels: { totalChannels: number; totalMembers: number; averageMembersPerChannel: number };
  } {
    const { AgentRegistry: AR } = require('./core/agents/AgentRegistry.js');
    const { ToolRegistry: TR } = require('./core/tools/ToolRegistry.js');

    return {
      agents: AR.getMetrics(),
      tools: TR.getMetrics(),
      channels: this.channelManager?.getStats() || { totalChannels: 0, totalMembers: 0, averageMembersPerChannel: 0 }
    };
  }

  /**
   * Get infrastructure instances
   * For advanced use cases where users need direct access
   */
  getInfrastructure(): {
    agentManager?: AgentManager;
    channelManager?: ChannelManager;
    eventBus?: HiveEventBus;
    transport?: ITransport;
  } {
    return {
      agentManager: this.agentManager,
      channelManager: this.channelManager,
      eventBus: this.eventBus,
      transport: this.transport
    };
  }
}
