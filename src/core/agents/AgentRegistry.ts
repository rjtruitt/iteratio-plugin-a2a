/**
 * AgentRegistry - Central registry for agent discovery and tracking
 *
 * Provides a global registry for agent instances with discovery by ID,
 * role, and status. Similar to a service discovery pattern.
 *
 * @example
 * ```typescript
 * // Register agent
 * AgentRegistry.register({
 *   id: 'worker-1',
 *   name: 'Code Reviewer',
 *   role: 'worker',
 *   status: 'active'
 * });
 *
 * // Discover agents
 * const workers = AgentRegistry.getByRole('worker');
 * const active = AgentRegistry.getByStatus('active');
 * ```
 */

import type { AgentIdentity } from '../../types/agent.js';

export interface RegistryMetrics {
    totalAgents: number;
    agentsByRole: Map<string, number>;
    agentsByStatus: Map<string, number>;
    registrations: number;
    unregistrations: number;
}

export interface AgentRegistryConfig {
    /** Enable metrics collection */
    collectMetrics?: boolean;
    /** Allow duplicate agent IDs (last registration wins) */
    allowDuplicates?: boolean;
}

/**
 * Global agent registry for discovery and tracking
 */
export class AgentRegistry {
    private static instance: AgentRegistry;
    private agents: Map<string, AgentIdentity>;
    private config: Required<AgentRegistryConfig>;
    private metrics: RegistryMetrics;

    private constructor(config: AgentRegistryConfig = {}) {
        this.agents = new Map();
        this.config = {
            collectMetrics: config.collectMetrics ?? true,
            allowDuplicates: config.allowDuplicates ?? false
        };
        this.metrics = {
            totalAgents: 0,
            agentsByRole: new Map(),
            agentsByStatus: new Map(),
            registrations: 0,
            unregistrations: 0
        };
    }

    /**
     * Get singleton instance
     */
    private static getInstance(): AgentRegistry {
        if (!AgentRegistry.instance) {
            AgentRegistry.instance = new AgentRegistry();
        }
        return AgentRegistry.instance;
    }

    /**
     * Register agent
     */
    static register(agent: AgentIdentity): void {
        const registry = this.getInstance();

        // Check for duplicates
        if (!registry.config.allowDuplicates && registry.agents.has(agent.id)) {
            throw new Error(`Agent already registered: ${agent.id}`);
        }

        // Register agent
        registry.agents.set(agent.id, agent);

        // Update metrics
        if (registry.config.collectMetrics) {
            registry.metrics.totalAgents = registry.agents.size;
            registry.metrics.registrations++;

            // Update role metrics
            const roleCount = registry.metrics.agentsByRole.get(agent.role) || 0;
            registry.metrics.agentsByRole.set(agent.role, roleCount + 1);

            // Update status metrics
            const statusCount = registry.metrics.agentsByStatus.get(agent.status) || 0;
            registry.metrics.agentsByStatus.set(agent.status, statusCount + 1);
        }
    }

    /**
     * Unregister agent
     */
    static unregister(id: string): boolean {
        const registry = this.getInstance();
        const agent = registry.agents.get(id);

        if (!agent) {
            return false;
        }

        registry.agents.delete(id);

        // Update metrics
        if (registry.config.collectMetrics) {
            registry.metrics.totalAgents = registry.agents.size;
            registry.metrics.unregistrations++;

            // Update role metrics
            const roleCount = registry.metrics.agentsByRole.get(agent.role) || 0;
            if (roleCount > 1) {
                registry.metrics.agentsByRole.set(agent.role, roleCount - 1);
            } else {
                registry.metrics.agentsByRole.delete(agent.role);
            }

            // Update status metrics
            const statusCount = registry.metrics.agentsByStatus.get(agent.status) || 0;
            if (statusCount > 1) {
                registry.metrics.agentsByStatus.set(agent.status, statusCount - 1);
            } else {
                registry.metrics.agentsByStatus.delete(agent.status);
            }
        }

        return true;
    }

    /**
     * Update agent status
     */
    static updateStatus(id: string, status: string): boolean {
        const registry = this.getInstance();
        const agent = registry.agents.get(id);

        if (!agent) {
            return false;
        }

        // Update metrics (remove from old status, add to new)
        if (registry.config.collectMetrics && agent.status !== status) {
            const oldStatusCount = registry.metrics.agentsByStatus.get(agent.status) || 0;
            if (oldStatusCount > 1) {
                registry.metrics.agentsByStatus.set(agent.status, oldStatusCount - 1);
            } else {
                registry.metrics.agentsByStatus.delete(agent.status);
            }

            const newStatusCount = registry.metrics.agentsByStatus.get(status) || 0;
            registry.metrics.agentsByStatus.set(status, newStatusCount + 1);
        }

        // Update agent
        agent.status = status;
        registry.agents.set(id, agent);

        return true;
    }

    /**
     * Get agent by ID
     */
    static get(id: string): AgentIdentity | undefined {
        return this.getInstance().agents.get(id);
    }

    /**
     * Check if agent exists
     */
    static has(id: string): boolean {
        return this.getInstance().agents.has(id);
    }

    /**
     * Get all agents
     */
    static getAll(): AgentIdentity[] {
        return Array.from(this.getInstance().agents.values());
    }

    /**
     * Get agents by role
     */
    static getByRole(role: string): AgentIdentity[] {
        const registry = this.getInstance();
        return Array.from(registry.agents.values()).filter(agent => agent.role === role);
    }

    /**
     * Get agents by status
     */
    static getByStatus(status: string): AgentIdentity[] {
        const registry = this.getInstance();
        return Array.from(registry.agents.values()).filter(agent => agent.status === status);
    }

    /**
     * Get all roles
     */
    static getRoles(): string[] {
        const registry = this.getInstance();
        const roles = new Set<string>();
        for (const agent of registry.agents.values()) {
            roles.add(agent.role);
        }
        return Array.from(roles);
    }

    /**
     * Get all statuses
     */
    static getStatuses(): string[] {
        const registry = this.getInstance();
        const statuses = new Set<string>();
        for (const agent of registry.agents.values()) {
            statuses.add(agent.status);
        }
        return Array.from(statuses);
    }

    /**
     * Search agents by name pattern
     */
    static search(pattern: string): AgentIdentity[] {
        const registry = this.getInstance();
        const regex = new RegExp(pattern, 'i');
        return Array.from(registry.agents.values()).filter(agent => regex.test(agent.name || agent.id));
    }

    /**
     * Clear all agents
     */
    static clear(): void {
        const registry = this.getInstance();
        registry.agents.clear();
        if (registry.config.collectMetrics) {
            registry.metrics.totalAgents = 0;
            registry.metrics.agentsByRole.clear();
            registry.metrics.agentsByStatus.clear();
        }
    }

    /**
     * Get registry metrics
     */
    static getMetrics(): RegistryMetrics {
        const registry = this.getInstance();
        return {
            ...registry.metrics,
            agentsByRole: new Map(registry.metrics.agentsByRole),
            agentsByStatus: new Map(registry.metrics.agentsByStatus)
        };
    }

    /**
     * Configure registry
     */
    static configure(config: AgentRegistryConfig): void {
        const registry = this.getInstance();
        registry.config = {
            collectMetrics: config.collectMetrics ?? registry.config.collectMetrics,
            allowDuplicates: config.allowDuplicates ?? registry.config.allowDuplicates
        };
    }
}
