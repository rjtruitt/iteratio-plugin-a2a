/**
 * InMemoryTransport - In-process message delivery
 *
 * Fast, synchronous transport for single-process multi-agent systems.
 * Perfect for testing, development, and local coordination.
 *
 * @example
 * ```typescript
 * const transport = new InMemoryTransport();
 * await transport.subscribe('agent-1', (msg) => console.log('Received:', msg));
 * await transport.send('agent-2', 'agent-1', { id: '1', from: 'agent-2', ... });
 * ```
 */

import { BaseTransport, TransportConfig } from './BaseTransport.js';
import type { Message } from '../../types/messages.js';

interface ChannelSubscription {
    channel: string;
    agentId: string;
    handler: (message: Message) => void | Promise<void>;
}

/**
 * In-memory transport for single-process coordination
 */
export class InMemoryTransport extends BaseTransport {
    private handlers: Map<string, (message: Message) => void | Promise<void>>;
    private channelSubscriptions: Map<string, ChannelSubscription[]>;
    private connectedAgents: Set<string>;

    constructor(config?: TransportConfig) {
        super(config);
        this.handlers = new Map();
        this.channelSubscriptions = new Map();
        this.connectedAgents = new Set();
    }

    protected async sendImpl(_from: string, to: string, message: Message): Promise<void> {
        const handler = this.handlers.get(to);
        if (!handler) {
            throw new Error(`No handler registered for agent: ${to}`);
        }

        // Deliver synchronously (in-memory is instant)
        await handler(message);
    }

    protected async publishImpl(channel: string, message: Message): Promise<void> {
        const subscriptions = this.channelSubscriptions.get(channel) || [];

        if (subscriptions.length === 0) {
            // No subscribers - message goes into void (like IRC)
            return;
        }

        // Deliver to all channel subscribers in parallel
        await Promise.all(
            subscriptions.map(sub => sub.handler(message))
        );
    }

    protected async subscribeImpl(agentId: string, handler: (message: Message) => void | Promise<void>): Promise<void> {
        this.handlers.set(agentId, handler);
        this.connectedAgents.add(agentId);
    }

    protected async unsubscribeImpl(agentId: string): Promise<void> {
        this.handlers.delete(agentId);

        // Remove from all channel subscriptions
        for (const [channel, subs] of this.channelSubscriptions.entries()) {
            const filtered = subs.filter(sub => sub.agentId !== agentId);
            if (filtered.length === 0) {
                this.channelSubscriptions.delete(channel);
            } else {
                this.channelSubscriptions.set(channel, filtered);
            }
        }
    }

    protected async disconnectImpl(agentId: string): Promise<void> {
        this.connectedAgents.delete(agentId);
    }

    protected async getConnectedImpl(): Promise<string[]> {
        return Array.from(this.connectedAgents);
    }

    /**
     * Join a channel (IRC-style)
     */
    async joinChannel(channel: string, agentId: string): Promise<void> {
        this.validateChannelName(channel);
        this.validateAgentId(agentId, 'agentId');

        const handler = this.handlers.get(agentId);
        if (!handler) {
            throw new Error(`Agent ${agentId} must be subscribed before joining channels`);
        }

        const subs = this.channelSubscriptions.get(channel) || [];

        // Don't add duplicate
        if (subs.some(sub => sub.agentId === agentId)) {
            return;
        }

        subs.push({ channel, agentId, handler });
        this.channelSubscriptions.set(channel, subs);
    }

    /**
     * Leave a channel
     */
    async leaveChannel(channel: string, agentId: string): Promise<void> {
        this.validateChannelName(channel);
        this.validateAgentId(agentId, 'agentId');

        const subs = this.channelSubscriptions.get(channel);
        if (!subs) {
            return;
        }

        const filtered = subs.filter(sub => sub.agentId !== agentId);
        if (filtered.length === 0) {
            this.channelSubscriptions.delete(channel);
        } else {
            this.channelSubscriptions.set(channel, filtered);
        }
    }

    /**
     * Get list of channels
     */
    getChannels(): string[] {
        return Array.from(this.channelSubscriptions.keys());
    }

    /**
     * Get members of a channel
     */
    getChannelMembers(channel: string): string[] {
        const subs = this.channelSubscriptions.get(channel) || [];
        return subs.map(sub => sub.agentId);
    }

    /**
     * Check if agent is in channel
     */
    isInChannel(channel: string, agentId: string): boolean {
        const subs = this.channelSubscriptions.get(channel) || [];
        return subs.some(sub => sub.agentId === agentId);
    }

    /**
     * Clear all subscriptions and channels (for testing)
     */
    clear(): void {
        this.handlers.clear();
        this.channelSubscriptions.clear();
        this.connectedAgents.clear();
        this.resetMetrics();
    }
}
