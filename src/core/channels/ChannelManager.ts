/**
 * ChannelManager - Manages communication channels between agents
 *
 * Handles channel creation, membership, and topic tracking. Provides
 * structured multi-agent communication with topic summaries.
 *
 * @example
 * ```typescript
 * const manager = new ChannelManager({ transport });
 *
 * // Create channel
 * await manager.create('#code-review-123');
 *
 * // Join channel
 * await manager.join('#code-review-123', 'worker-1');
 *
 * // Update topic
 * await manager.updateTopic('#code-review-123', {
 *   channel: '#code-review-123',
 *   summary: '3 issues found, 2 fixed',
 *   keyDecisions: ['XSS fixed', 'CSRF fixed'],
 *   activeWorkers: ['worker-1'],
 *   lastUpdated: Date.now()
 * });
 * ```
 */

import type { ITransport } from '../../types/interfaces.js';
import type { Channel, ChannelTopic } from '../../types/channels.js';
import { HiveEventBus, HiveEvent } from '../events/HiveEventBus.js';

export interface ChannelManagerConfig {
    /** Transport for communication */
    transport: ITransport;
    /** Event bus for channel events */
    eventBus?: HiveEventBus;
    /** Maximum channels per manager */
    maxChannels?: number;
}

/**
 * Manager for multi-agent communication channels
 */
export class ChannelManager {
    private transport: ITransport;
    private eventBus?: HiveEventBus;
    private config: Required<Omit<ChannelManagerConfig, 'eventBus'>> & { eventBus?: HiveEventBus };
    private channels: Map<string, Channel>;

    constructor(config: ChannelManagerConfig) {
        this.transport = config.transport;
        this.eventBus = config.eventBus;
        this.config = {
            transport: config.transport,
            eventBus: config.eventBus,
            maxChannels: config.maxChannels ?? 1000
        };
        this.channels = new Map();
    }

    /**
     * Create channel
     */
    async create(name: string): Promise<Channel> {
        // Validate channel name
        this.validateChannelName(name);

        // Check if already exists
        if (this.channels.has(name)) {
            throw new Error(`Channel already exists: ${name}`);
        }

        // Check max channels limit
        if (this.channels.size >= this.config.maxChannels) {
            throw new Error(`Maximum channels (${this.config.maxChannels}) reached`);
        }

        // Create channel
        const channel: Channel = {
            name,
            members: new Map(),
            createdAt: Date.now()
        };

        this.channels.set(name, channel);

        // Emit event
        this.emitEvent({
            id: `channel-create-${Date.now()}`,
            type: 'channel.created',
            timestamp: Date.now(),
            source: 'ChannelManager',
            data: { channel: name }
        });

        return channel;
    }

    /**
     * Delete channel
     */
    async delete(name: string): Promise<void> {
        const channel = this.channels.get(name);
        if (!channel) {
            throw new Error(`Channel not found: ${name}`);
        }

        // Disconnect all members (if transport supports it)
        // For now, just clear membership
        channel.members.clear();

        this.channels.delete(name);

        // Emit event
        this.emitEvent({
            id: `channel-delete-${Date.now()}`,
            type: 'channel.deleted',
            timestamp: Date.now(),
            source: 'ChannelManager',
            data: { channel: name }
        });
    }

    /**
     * Join channel
     */
    async join(channelName: string, agentId: string): Promise<void> {
        let channel = this.channels.get(channelName);

        // Auto-create channel if it doesn't exist
        if (!channel) {
            channel = await this.create(channelName);
        }

        // Add member
        channel.members.set(agentId, {
            joinedAt: Date.now(),
            lastActive: Date.now()
        });

        // Emit event
        this.emitEvent({
            id: `channel-join-${Date.now()}`,
            type: 'channel.joined',
            timestamp: Date.now(),
            source: 'ChannelManager',
            data: { channel: channelName, agent: agentId }
        });
    }

    /**
     * Leave channel
     */
    async leave(channelName: string, agentId: string): Promise<void> {
        const channel = this.channels.get(channelName);
        if (!channel) {
            throw new Error(`Channel not found: ${channelName}`);
        }

        if (!channel.members.has(agentId)) {
            throw new Error(`Agent ${agentId} is not a member of ${channelName}`);
        }

        channel.members.delete(agentId);

        // Auto-delete empty channels
        if (channel.members.size === 0) {
            await this.delete(channelName);
        }

        // Emit event
        this.emitEvent({
            id: `channel-leave-${Date.now()}`,
            type: 'channel.left',
            timestamp: Date.now(),
            source: 'ChannelManager',
            data: { channel: channelName, agent: agentId }
        });
    }

    /**
     * Update channel topic
     */
    async updateTopic(channelName: string, topic: ChannelTopic): Promise<void> {
        const channel = this.channels.get(channelName);
        if (!channel) {
            throw new Error(`Channel not found: ${channelName}`);
        }

        channel.topic = topic;

        // Emit event
        this.emitEvent({
            id: `channel-topic-${Date.now()}`,
            type: 'channel.topic_updated',
            timestamp: Date.now(),
            source: 'ChannelManager',
            data: { channel: channelName, topic }
        });
    }

    /**
     * Get channel topic
     */
    getTopic(channelName: string): ChannelTopic | undefined {
        const channel = this.channels.get(channelName);
        return channel?.topic;
    }

    /**
     * Get channel members
     */
    getMembers(channelName: string): string[] {
        const channel = this.channels.get(channelName);
        if (!channel) {
            return [];
        }
        return Array.from(channel.members.keys());
    }

    /**
     * Get member count
     */
    getMemberCount(channelName: string): number {
        const channel = this.channels.get(channelName);
        return channel?.members.size || 0;
    }

    /**
     * Check if agent is in channel
     */
    isMember(channelName: string, agentId: string): boolean {
        const channel = this.channels.get(channelName);
        return channel?.members.has(agentId) || false;
    }

    /**
     * Get channel
     */
    get(channelName: string): Channel | undefined {
        return this.channels.get(channelName);
    }

    /**
     * List all channels
     */
    list(): string[] {
        return Array.from(this.channels.keys());
    }

    /**
     * Get channels for agent
     */
    getChannelsForAgent(agentId: string): string[] {
        const channels: string[] = [];
        for (const [name, channel] of this.channels.entries()) {
            if (channel.members.has(agentId)) {
                channels.push(name);
            }
        }
        return channels;
    }

    /**
     * Broadcast message to all members of a channel via transport publish
     */
    async broadcast(channelName: string, message: any): Promise<void> {
        const channel = this.channels.get(channelName);
        if (!channel) {
            throw new Error(`Channel not found: ${channelName}`);
        }

        for (const _agentId of channel.members.keys()) {
            await this.transport.publish(channelName, message);
        }
    }

    /**
     * Send direct message to a specific agent (point-to-point)
     */
    async directMessage(from: string, to: string, message: any): Promise<void> {
        await this.transport.send(from, to, message);
    }

    /**
     * Remove agent from all channels
     */
    async removeAgentFromAll(agentId: string): Promise<void> {
        for (const [name, channel] of this.channels.entries()) {
            if (channel.members.has(agentId)) {
                channel.members.delete(agentId);
                if (channel.members.size === 0) {
                    this.channels.delete(name);
                }
            }
        }
    }

    /**
     * Clear all channels
     */
    clear(): void {
        this.channels.clear();
    }

    /**
     * Get statistics
     */
    getStats(): {
        totalChannels: number;
        totalMembers: number;
        averageMembersPerChannel: number;
    } {
        const totalChannels = this.channels.size;
        let totalMembers = 0;

        for (const channel of this.channels.values()) {
            totalMembers += channel.members.size;
        }

        return {
            totalChannels,
            totalMembers,
            averageMembersPerChannel: totalChannels > 0 ? Math.round(totalMembers / totalChannels) : 0
        };
    }

    /**
     * Validate channel name
     */
    private validateChannelName(name: string): void {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new Error('Invalid channel name: must be non-empty string');
        }
        if (!name.startsWith('#')) {
            throw new Error('Invalid channel name: must start with #');
        }
        if (name.length > 100) {
            throw new Error('Invalid channel name: maximum 100 characters');
        }
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
