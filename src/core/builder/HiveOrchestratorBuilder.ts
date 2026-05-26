/**
 * HiveOrchestratorBuilder - Fluent API for building orchestrator
 *
 * Provides chainable methods for configuring the orchestrator.
 * Makes it easy to gradually build up configuration.
 *
 * @example
 * ```typescript
 * const hive = new HiveOrchestratorBuilder()
 *   .withTransport(new BroadcastChannelTransport())
 *   .withMemory(new InMemoryCoordinationMemory())
 *   .withHandler(new ToolCountThresholdHandler({ threshold: 50 }))
 *   .withEventBus(new HiveEventBus())
 *   .build();
 * ```
 */

import type { ITransport, ICoordinationMemory, IDeclarativeHandler } from '../../types/interfaces.js';
import { HiveEventBus } from '../events/HiveEventBus.js';
import { HiveOrchestrator, HiveOrchestratorConfig } from './HiveOrchestrator.js';

/**
 * Fluent builder for HiveOrchestrator
 */
export class HiveOrchestratorBuilder {
    private config: HiveOrchestratorConfig = {};

    /**
     * Set transport
     */
    withTransport(transport: ITransport): this {
        this.config.transport = transport;
        return this;
    }

    /**
     * Set memory
     */
    withMemory(memory: ICoordinationMemory): this {
        this.config.memory = memory;
        return this;
    }

    /**
     * Set event bus
     */
    withEventBus(eventBus: HiveEventBus): this {
        this.config.eventBus = eventBus;
        return this;
    }

    /**
     * Add handler
     */
    withHandler(handler: IDeclarativeHandler): this {
        if (!this.config.handlers) {
            this.config.handlers = [];
        }
        this.config.handlers.push(handler);
        return this;
    }

    /**
     * Add multiple handlers
     */
    withHandlers(...handlers: IDeclarativeHandler[]): this {
        if (!this.config.handlers) {
            this.config.handlers = [];
        }
        this.config.handlers.push(...handlers);
        return this;
    }

    /**
     * Configure agent manager
     */
    withAgentConfig(config: { maxAgents?: number; autoRegister?: boolean }): this {
        this.config.agentConfig = config;
        return this;
    }

    /**
     * Configure channel manager
     */
    withChannelConfig(config: { maxChannels?: number }): this {
        this.config.channelConfig = config;
        return this;
    }

    /**
     * Set max agents
     */
    withMaxAgents(maxAgents: number): this {
        if (!this.config.agentConfig) {
            this.config.agentConfig = {};
        }
        this.config.agentConfig.maxAgents = maxAgents;
        return this;
    }

    /**
     * Set max channels
     */
    withMaxChannels(maxChannels: number): this {
        if (!this.config.channelConfig) {
            this.config.channelConfig = {};
        }
        this.config.channelConfig.maxChannels = maxChannels;
        return this;
    }

    /**
     * Enable/disable auto-registration of agents
     */
    withAutoRegister(autoRegister: boolean): this {
        if (!this.config.agentConfig) {
            this.config.agentConfig = {};
        }
        this.config.agentConfig.autoRegister = autoRegister;
        return this;
    }

    /**
     * Apply a named preset configuration
     */
    preset(name: 'fan-out' | 'pipeline' | 'round-robin'): this {
        switch (name) {
            case 'fan-out':
                this.config.agentConfig = { ...this.config.agentConfig, maxAgents: 10 };
                break;
            case 'pipeline':
                this.config.agentConfig = { ...this.config.agentConfig, maxAgents: 5 };
                break;
            case 'round-robin':
                this.config.agentConfig = { ...this.config.agentConfig, maxAgents: 5 };
                break;
        }
        return this;
    }

    /**
     * Build orchestrator
     */
    build(): HiveOrchestrator {
        return new HiveOrchestrator(this.config);
    }
}
