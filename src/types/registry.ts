import type { AgentTemplate } from './agent.js';
import type { HiveTool } from './interfaces.js';
import type { IDeclarativeHandler } from './interfaces.js';
import type { Channel } from './channels.js';

/**
 * Service-discovery pattern for tools. Agents query the registry to find
 * tools by name/tag/category rather than receiving a static tool list.
 */
export interface IToolRegistry {
  /**
   * Register a tool
   */
  register(tool: HiveTool): void;

  /**
   * Unregister a tool
   */
  unregister(toolName: string): void;

  /**
   * Get tool by name
   */
  get(toolName: string): HiveTool | undefined;

  /**
   * List all registered tools
   */
  list(): HiveTool[];

  /**
   * Find tools by tag/category
   */
  findByTag(tag: string): HiveTool[];

  /**
   * Check if tool exists
   */
  has(toolName: string): boolean;
}

/**
 * Catalog of reusable agent blueprints. Enables spawning by template ID
 * rather than repeating full configuration each time.
 */
export interface ITemplateRegistry {
  /**
   * Register an agent template
   */
  register(template: AgentTemplate): void;

  /**
   * Unregister a template
   */
  unregister(templateId: string): void;

  /**
   * Get template by ID
   */
  get(templateId: string): AgentTemplate | undefined;

  /**
   * List all registered templates
   */
  list(): AgentTemplate[];

  /**
   * Find templates by role
   */
  findByRole(role: 'orchestrator' | 'worker' | 'task'): AgentTemplate[];

  /**
   * Find templates by capability
   */
  findByCapability(capability: string): AgentTemplate[];

  /**
   * Check if template exists
   */
  has(templateId: string): boolean;
}

/**
 * Registry for declarative message handlers. Routes incoming messages
 * to the correct handler based on message type matching.
 */
export interface IHandlerRegistry {
  /**
   * Register a declarative handler
   */
  register(handler: IDeclarativeHandler): void;

  /**
   * Unregister a handler
   */
  unregister(handler: IDeclarativeHandler): void;

  /**
   * Get all registered handlers
   */
  list(): IDeclarativeHandler[];

  /**
   * Find handlers that can handle a specific message type
   */
  findHandlers(messageType: string): IDeclarativeHandler[];

  /**
   * Clear all handlers
   */
  clear(): void;
}

/**
 * CRUD interface for IRC-style channels. Manages creation, membership,
 * and topic updates for multi-agent communication scopes.
 */
export interface IChannelRegistry {
  /**
   * Create a new channel
   */
  create(name: string, metadata?: Record<string, unknown>): Promise<Channel>;

  /**
   * Delete a channel
   */
  delete(name: string): Promise<void>;

  /**
   * Get channel by name
   */
  get(name: string): Promise<Channel | undefined>;

  /**
   * List all active channels
   */
  list(): Promise<Channel[]>;

  /**
   * Check if channel exists
   */
  has(name: string): Promise<boolean>;

  /**
   * Add member to channel
   */
  addMember(channelName: string, userId: string, role?: 'orchestrator' | 'moderator' | 'user'): Promise<void>;

  /**
   * Remove member from channel
   */
  removeMember(channelName: string, userId: string): Promise<void>;

  /**
   * Get channel members
   */
  getMembers(channelName: string): Promise<string[]>;

  /**
   * Update channel topic
   */
  updateTopic(channelName: string, topic: string): Promise<void>;
}

/**
 * Composite registry providing unified access to all component registries.
 * Simplifies dependency injection when a consumer needs multiple registries.
 */
export interface IHiveRegistry {
  tools: IToolRegistry;
  templates: ITemplateRegistry;
  handlers: IHandlerRegistry;
  channels: IChannelRegistry;
}
