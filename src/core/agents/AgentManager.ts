/**
 * AgentManager - Lifecycle management for agents
 *
 * Handles spawning, terminating, and monitoring agents. Integrates with
 * AgentRegistry for discovery and EventBus for lifecycle events.
 *
 * @example
 * ```typescript
 * const manager = new AgentManager({ transport, eventBus });
 *
 * // Spawn agent from template
 * const agent = await manager.spawn(codeReviewerTemplate);
 *
 * // Monitor status
 * const status = manager.getStatus(agent.id);
 *
 * // Terminate
 * await manager.terminate(agent.id);
 * ```
 */

import type { ITransport } from '../../types/interfaces.js';
import type { AgentIdentity, AgentTemplate } from '../../types/agent.js';
import { AgentRegistry } from './AgentRegistry.js';
import { HiveEventBus, HiveEvent } from '../events/HiveEventBus.js';

export interface AgentManagerConfig {
    /** Transport for agent communication */
    transport: ITransport;
    /** Event bus for lifecycle events */
    eventBus?: HiveEventBus;
    /** Maximum concurrent agents */
    maxAgents?: number;
    /** Enable automatic registry integration */
    autoRegister?: boolean;
    /** Auto-terminate idle agents after this timeout (ms) */
    idleTimeout?: number;
}

export interface SpawnOptions {
    /** Override agent ID */
    id?: string;
    /** Override agent name */
    name?: string;
    /** Initial status */
    status?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Agent lifecycle manager
 */
export class AgentManager {
    private transport: ITransport;
    private eventBus?: HiveEventBus;
    private config: Required<Omit<AgentManagerConfig, 'eventBus'>> & { eventBus?: HiveEventBus };
    private activeAgents: Set<string>;

    constructor(config: AgentManagerConfig) {
        this.transport = config.transport;
        this.eventBus = config.eventBus;
        this.config = {
            transport: config.transport,
            eventBus: config.eventBus,
            maxAgents: config.maxAgents ?? 100,
            autoRegister: config.autoRegister ?? true,
            idleTimeout: (config as any).idleTimeout ?? 0,
        };
        this.activeAgents = new Set();

        // Configure registry to allow duplicates (manager handles its own tracking)
        if (this.config.autoRegister) {
            AgentRegistry.configure({ allowDuplicates: true });
        }
    }

    /**
     * Spawn agent from template
     */
    async spawn(template: AgentTemplate, options?: SpawnOptions): Promise<AgentIdentity> {
        // Check max agents limit
        if (this.activeAgents.size >= this.config.maxAgents) {
            throw new Error(`Maximum agents (${this.config.maxAgents}) reached`);
        }

        // Generate agent identity
        const agentId = options?.id || this.generateAgentId(template);
        const agent: AgentIdentity = {
            id: agentId,
            name: options?.name || template.displayName,
            role: template.role,
            status: options?.status || 'spawning',
            spawnedAt: Date.now(),
            metadata: {
                templateId: template.id,
                ...options?.metadata
            }
        };

        // Register with transport
        await this.transport.subscribe(agentId, async (_message) => {
            // Agent message handler (can be overridden by user)
        });

        // Add to active agents
        this.activeAgents.add(agentId);

        // Auto-register if configured
        if (this.config.autoRegister) {
            AgentRegistry.register(agent);
        }

        // Update status to active
        agent.status = 'active';
        if (this.config.autoRegister) {
            AgentRegistry.updateStatus(agentId, 'active');
        }

        // Emit spawn event
        this.emitEvent({
            id: `spawn-${Date.now()}`,
            type: 'agent.spawned',
            timestamp: Date.now(),
            source: 'AgentManager',
            data: { agent }
        });

        return agent;
    }

    /**
     * Terminate agent
     */
    async terminate(agentId: string): Promise<void> {
        if (!this.activeAgents.has(agentId)) {
            throw new Error(`Agent not found: ${agentId}`);
        }

        // Update status
        if (this.config.autoRegister) {
            AgentRegistry.updateStatus(agentId, 'terminating');
        }

        // Disconnect from transport
        await this.transport.disconnect(agentId);

        // Remove from active agents
        this.activeAgents.delete(agentId);

        // Unregister if auto-registered
        if (this.config.autoRegister) {
            AgentRegistry.unregister(agentId);
        }

        // Emit terminate event
        this.emitEvent({
            id: `terminate-${Date.now()}`,
            type: 'agent.terminated',
            timestamp: Date.now(),
            source: 'AgentManager',
            data: { agentId }
        });
    }

    /**
     * Get agent status from registry or synthesize minimal identity
     */
    getStatus(agentId: string): AgentIdentity | undefined {
        if (!this.config.autoRegister) {
            return this.activeAgents.has(agentId)
                ? { id: agentId, name: agentId, role: 'worker', status: 'active' }
                : undefined;
        }

        return AgentRegistry.get(agentId);
    }

    /**
     * List all agents currently managed by this instance
     */
    list(): AgentIdentity[] {
        if (this.config.autoRegister) {
            return AgentRegistry.getAll().filter(agent => this.activeAgents.has(agent.id));
        }

        return Array.from(this.activeAgents).map(id => ({
            id,
            name: id,
            role: 'worker' as const,
            status: 'active'
        }));
    }

    /**
     * Get active agent count
     */
    getActiveCount(): number {
        return this.activeAgents.size;
    }

    /**
     * Check if agent is managed by this manager
     */
    isManaged(agentId: string): boolean {
        return this.activeAgents.has(agentId);
    }

    /**
     * Terminate all managed agents
     */
    async terminateAll(): Promise<void> {
        const agents = Array.from(this.activeAgents);
        await Promise.all(agents.map(id => this.terminate(id)));
    }

    /**
     * Check for idle agents and terminate those exceeding timeout
     */
    async checkIdleAgents(): Promise<void> {
        const idleTimeout = (this.config as any).idleTimeout;
        if (!idleTimeout) return;
        // Placeholder: in a real implementation, check agent last activity timestamps
    }

    /**
     * Generate unique agent ID
     */
    private generateAgentId(template: AgentTemplate): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `${template.role}-${timestamp}-${random}`;
    }

    /**
     * Emit event if event bus configured
     */
    private emitEvent(event: HiveEvent): void {
        if (this.eventBus) {
            this.eventBus.emit(event);
        }
    }
}
