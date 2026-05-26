/**
 * HiveOrchestrator - Convenience facade for agent coordination.
 *
 * Reduces boilerplate by bundling transport, managers, and registries into
 * one object with sensible defaults. Users who need fine-grained control
 * can still use individual components directly.
 *
 * @example
 * ```typescript
 * const hive = new HiveOrchestrator({
 *   transport: new BroadcastChannelTransport(),
 *   memory: new InMemoryCoordinationMemory(),
 *   eventBus: new HiveEventBus()
 * });
 *
 * await hive.channels.create('#code-review');
 * await hive.agents.spawn(template);
 * hive.tools.register(tool);
 * ```
 */

import type { ITransport, ICoordinationMemory } from '../../types/interfaces.js';
import { InMemoryTransport } from '../transport/InMemoryTransport.js';
import { InMemoryCoordinationMemory } from '../memory/InMemoryCoordinationMemory.js';
import { HiveEventBus } from '../events/HiveEventBus.js';
import { AgentManager } from '../agents/AgentManager.js';
import { ChannelManager } from '../channels/ChannelManager.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { DeclarativeHandlerChain } from '../handlers/DeclarativeHandlerChain.js';
import type { IDeclarativeHandler } from '../../types/interfaces.js';

export interface HiveOrchestratorConfig {
    /** Transport for agent communication (default: InMemoryTransport) */
    transport?: ITransport;
    /** Memory for coordination patterns (default: InMemoryCoordinationMemory) */
    memory?: ICoordinationMemory;
    /** Event bus for lifecycle events (default: new HiveEventBus) */
    eventBus?: HiveEventBus;
    /** Declarative message handlers (default: empty chain) */
    handlers?: IDeclarativeHandler[];
    /** Agent manager config */
    agentConfig?: {
        maxAgents?: number;
        autoRegister?: boolean;
    };
    /** Channel manager config */
    channelConfig?: {
        maxChannels?: number;
    };
}

/**
 * Main orchestrator facade for agent coordination
 */
export class HiveOrchestrator {
    /** Transport layer */
    readonly transport: ITransport;

    /** Coordination pattern memory */
    readonly memory: ICoordinationMemory;

    /** Event bus */
    readonly eventBus: HiveEventBus;

    /** Agent lifecycle manager */
    readonly agents: AgentManager;

    /** Channel manager */
    readonly channels: ChannelManager;

    /** Declarative handler chain */
    readonly handlers: DeclarativeHandlerChain;

    /** Tool registry (static singleton) */
    readonly tools = ToolRegistry;

    constructor(config: HiveOrchestratorConfig = {}) {
        // Initialize transport (default: InMemory)
        this.transport = config.transport || new InMemoryTransport();

        // Initialize memory (default: InMemory)
        this.memory = config.memory || new InMemoryCoordinationMemory();

        // Initialize event bus
        this.eventBus = config.eventBus || new HiveEventBus();

        // Initialize handler chain
        this.handlers = new DeclarativeHandlerChain();
        if (config.handlers) {
            this.handlers.addHandlers(...config.handlers);
        }

        // Initialize managers
        this.agents = new AgentManager({
            transport: this.transport,
            eventBus: this.eventBus,
            maxAgents: config.agentConfig?.maxAgents,
            autoRegister: config.agentConfig?.autoRegister
        });

        this.channels = new ChannelManager({
            transport: this.transport,
            eventBus: this.eventBus,
            maxChannels: config.channelConfig?.maxChannels
        });
    }

    /**
     * Distribute tasks to available agents in a channel (stub -- round-robin)
     */
    async distribute(_channel: string, _tasks: string[]): Promise<void> {
        // Distribute tasks round-robin to channel members
    }

    /**
     * Distribute tasks based on agent capabilities (stub -- capability matching)
     */
    async distributeByCapability(_tasks: Array<{ task: string; requiredCapability: string }>): Promise<void> {
        // Match tasks to agents by capability
    }

    /**
     * Collect results from all workers in a task (stub)
     */
    async collectResults(_taskId: string): Promise<unknown[]> {
        return [];
    }

    /**
     * Aggregate results into single output
     */
    async aggregate(results: unknown[]): Promise<unknown> {
        return results;
    }

    /**
     * Retry failed subtask with a different agent (stub -- reassignment)
     */
    async retryWithDifferentAgent(_taskId: string, _failedAgentId: string): Promise<void> {
        // Reassign task to another available agent
    }

    /**
     * Report agent failure
     */
    async reportFailure(agentId: string, error: Error): Promise<void> {
        this.eventBus.emit({
            id: `failure-${Date.now()}`,
            type: 'agent.failed',
            timestamp: Date.now(),
            source: 'HiveOrchestrator',
            data: { agentId, error: error.message }
        });
    }

    /**
     * Execute tasks in parallel (stub -- fan-out pattern)
     */
    async executeParallel(_tasks: string[]): Promise<unknown[]> {
        return [];
    }

    /**
     * Execute tasks in sequential pipeline
     */
    async executePipeline(steps: Array<(input: unknown) => Promise<unknown>>): Promise<unknown> {
        let result: unknown = undefined;
        for (const step of steps) {
            result = await step(result);
        }
        return result;
    }

    /**
     * Mark task as complete and emit orchestration.complete event
     */
    async markComplete(taskId: string): Promise<void> {
        this.eventBus.emit({
            id: `complete-${Date.now()}`,
            type: 'orchestration.complete',
            timestamp: Date.now(),
            source: 'HiveOrchestrator',
            data: { taskId }
        });
    }

    /**
     * Get final aggregated result (stub)
     */
    async getFinalResult(_taskId: string): Promise<unknown> {
        return null;
    }

    /**
     * Set timeout for an agent (stub -- configures idle kill timer)
     */
    setAgentTimeout(_agentId: string, _timeoutMs: number): void {
        // Configure timeout for agent
    }

    /**
     * Handle agent timeout by emitting agent.timeout event
     */
    async handleTimeout(agentId: string): Promise<void> {
        this.eventBus.emit({
            id: `timeout-${Date.now()}`,
            type: 'agent.timeout',
            timestamp: Date.now(),
            source: 'HiveOrchestrator',
            data: { agentId }
        });
    }

    /**
     * Shutdown orchestrator and cleanup resources
     */
    async shutdown(): Promise<void> {
        // Terminate all agents
        await this.agents.terminateAll();

        // Clear channels
        this.channels.clear();

        // Disconnect transport (if it has a close method)
        if ('close' in this.transport && typeof (this.transport as any).close === 'function') {
            await (this.transport as any).close();
        }

        // Clear event bus
        this.eventBus.removeAllListeners();
    }

    /**
     * Get orchestrator statistics
     */
    getStats(): {
        agents: {
            active: number;
        };
        channels: {
            total: number;
            totalMembers: number;
            averageMembers: number;
        };
        tools: {
            registered: number;
            categories: string[];
            tags: string[];
        };
        handlers: {
            total: number;
            messagesHandled: number;
            messagesUnhandled: number;
        };
        events: {
            total: number;
            types: string[];
        };
        memory: {
            patterns: number;
        };
    } {
        const channelStats = this.channels.getStats();
        const toolMetrics = ToolRegistry.getMetrics();
        const handlerMetrics = this.handlers.getMetrics();
        const eventMetrics = this.eventBus.getMetrics();

        // Get memory stats if available
        let memoryPatterns = 0;
        if ('getCount' in this.memory && typeof (this.memory as any).getCount === 'function') {
            memoryPatterns = (this.memory as any).getCount();
        }

        return {
            agents: {
                active: this.agents.getActiveCount()
            },
            channels: {
                total: channelStats.totalChannels,
                totalMembers: channelStats.totalMembers,
                averageMembers: channelStats.averageMembersPerChannel
            },
            tools: {
                registered: toolMetrics.totalTools,
                categories: ToolRegistry.getCategories(),
                tags: ToolRegistry.getTags()
            },
            handlers: {
                total: this.handlers.getHandlers().length,
                messagesHandled: handlerMetrics.messagesHandled,
                messagesUnhandled: handlerMetrics.messagesUnhandled
            },
            events: {
                total: eventMetrics.totalEvents,
                types: this.eventBus.eventNames()
            },
            memory: {
                patterns: memoryPatterns
            }
        };
    }
}
