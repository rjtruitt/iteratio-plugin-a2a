/**
 * Instance-based AgentRegistry for test isolation.
 *
 * Unlike the singleton in core/agents/AgentRegistry, this version is
 * instantiable so each test gets a clean registry without global state leakage.
 */

export interface AgentEntry {
  id: string;
  name: string;
  role: string;
  status: string;
  [key: string]: unknown;
}

/** Registry of all agents available in the A2A network with capability lookups. */
export interface AgentRegistryConfig {
  maxAgents?: number;
  heartbeatTimeout?: number;
}

export class AgentRegistry {
  private agents: Map<string, AgentEntry> = new Map();
  private _config: AgentRegistryConfig = {};

  register(agent: AgentEntry): void {
    this.agents.set(agent.id, { ...agent });
  }

  unregister(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  updateStatus(agentId: string, status: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    agent.status = status;
    return true;
  }

  get(agentId: string): AgentEntry | undefined {
    return this.agents.get(agentId);
  }

  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  getAll(): AgentEntry[] {
    return Array.from(this.agents.values());
  }

  getByRole(role: string): AgentEntry[] {
    return this.getAll().filter(a => a.role === role);
  }

  getByStatus(status: string): AgentEntry[] {
    return this.getAll().filter(a => a.status === status);
  }

  getRoles(): string[] {
    const roles = new Set<string>();
    for (const agent of this.agents.values()) {
      roles.add(agent.role);
    }
    return Array.from(roles);
  }

  getStatuses(): string[] {
    const statuses = new Set<string>();
    for (const agent of this.agents.values()) {
      statuses.add(agent.status);
    }
    return Array.from(statuses);
  }

  search(criteria: Record<string, string>): AgentEntry[] {
    return this.getAll().filter(agent => {
      for (const [key, value] of Object.entries(criteria)) {
        const agentValue = String(agent[key] ?? '');
        if (!agentValue.includes(value)) return false;
      }
      return true;
    });
  }

  clear(): void {
    this.agents.clear();
  }

  getMetrics(): { totalAgents: number; byRole: Record<string, number>; byStatus: Record<string, number> } {
    const byRole: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const agent of this.agents.values()) {
      byRole[agent.role] = (byRole[agent.role] || 0) + 1;
      byStatus[agent.status] = (byStatus[agent.status] || 0) + 1;
    }
    return { totalAgents: this.agents.size, byRole, byStatus };
  }

  configure(config: AgentRegistryConfig): void {
    this._config = { ...this._config, ...config };
  }
}
