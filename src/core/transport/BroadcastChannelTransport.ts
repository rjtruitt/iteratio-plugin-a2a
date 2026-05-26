/**
 * BroadcastChannelTransport - Browser-based inter-tab/worker communication
 *
 * Uses native BroadcastChannel API for communication between browser tabs,
 * workers, and iframes. Zero network overhead for same-origin coordination.
 *
 * @example
 * ```typescript
 * const transport = new BroadcastChannelTransport({
 *   namespace: 'my-app' // Isolate from other apps
 * });
 *
 * await transport.subscribe('agent-1', (msg) => console.log('Received:', msg));
 * await transport.send('agent-2', 'agent-1', message);
 * ```
 */

import { BaseTransport, TransportConfig } from './BaseTransport.js';
import type { Message } from '../../types/messages.js';

export interface BroadcastChannelConfig extends TransportConfig {
    /** Namespace to isolate channels (default: 'hive-orchestrator') */
    namespace?: string;
}

interface BroadcastMessage {
    type: 'direct' | 'channel';
    from: string;
    to?: string; // For direct messages
    channel?: string; // For channel broadcasts
    message: Message;
}

/**
 * BroadcastChannel-based transport for browser environments
 */
export class BroadcastChannelTransport extends BaseTransport {
    private namespace: string;
    private broadcastChannel: any; // BroadcastChannel (DOM API, not available in Node)
    private handlers: Map<string, (message: Message) => void | Promise<void>>;
    private channelMemberships: Map<string, Set<string>>; // channel -> agentIds
    private connectedAgents: Set<string>;

    constructor(config: BroadcastChannelConfig = {}) {
        super(config);

        // Check if BroadcastChannel is available
        if (typeof globalThis.BroadcastChannel === 'undefined') {
            throw new Error('BroadcastChannel API not available. Use InMemoryTransport instead.');
        }

        this.namespace = config.namespace || 'hive-orchestrator';
        this.broadcastChannel = new globalThis.BroadcastChannel(this.namespace);
        this.handlers = new Map();
        this.channelMemberships = new Map();
        this.connectedAgents = new Set();

        // Listen for messages
        this.broadcastChannel.onmessage = (event: any) => {
            this.handleBroadcastMessage(event.data as BroadcastMessage);
        };
    }

    protected async sendImpl(from: string, to: string, message: Message): Promise<void> {
        const broadcastMsg: BroadcastMessage = {
            type: 'direct',
            from,
            to,
            message
        };

        this.broadcastChannel.postMessage(broadcastMsg);
    }

    protected async publishImpl(channel: string, message: Message): Promise<void> {
        const broadcastMsg: BroadcastMessage = {
            type: 'channel',
            from: message.from,
            channel,
            message
        };

        this.broadcastChannel.postMessage(broadcastMsg);
    }

    protected async subscribeImpl(agentId: string, handler: (message: Message) => void | Promise<void>): Promise<void> {
        this.handlers.set(agentId, handler);
        this.connectedAgents.add(agentId);
    }

    protected async unsubscribeImpl(agentId: string): Promise<void> {
        this.handlers.delete(agentId);

        // Remove from all channels
        for (const [channel, members] of this.channelMemberships.entries()) {
            members.delete(agentId);
            if (members.size === 0) {
                this.channelMemberships.delete(channel);
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
     * Join a channel
     */
    async joinChannel(channel: string, agentId: string): Promise<void> {
        this.validateChannelName(channel);
        this.validateAgentId(agentId, 'agentId');

        if (!this.handlers.has(agentId)) {
            throw new Error(`Agent ${agentId} must be subscribed before joining channels`);
        }

        let members = this.channelMemberships.get(channel);
        if (!members) {
            members = new Set();
            this.channelMemberships.set(channel, members);
        }

        members.add(agentId);
    }

    /**
     * Leave a channel
     */
    async leaveChannel(channel: string, agentId: string): Promise<void> {
        this.validateChannelName(channel);
        this.validateAgentId(agentId, 'agentId');

        const members = this.channelMemberships.get(channel);
        if (members) {
            members.delete(agentId);
            if (members.size === 0) {
                this.channelMemberships.delete(channel);
            }
        }
    }

    /**
     * Get channels
     */
    getChannels(): string[] {
        return Array.from(this.channelMemberships.keys());
    }

    /**
     * Get channel members
     */
    getChannelMembers(channel: string): string[] {
        return Array.from(this.channelMemberships.get(channel) || []);
    }

    /**
     * Check if agent is in channel
     */
    isInChannel(channel: string, agentId: string): boolean {
        return this.channelMemberships.get(channel)?.has(agentId) || false;
    }

    /**
     * Close transport and cleanup
     */
    async close(): Promise<void> {
        this.broadcastChannel.close();
        this.handlers.clear();
        this.channelMemberships.clear();
        this.connectedAgents.clear();
    }

    /**
     * Handle incoming broadcast message
     */
    private async handleBroadcastMessage(broadcastMsg: BroadcastMessage): Promise<void> {
        try {
            if (broadcastMsg.type === 'direct') {
                // Direct message to specific agent
                if (!broadcastMsg.to) {
                    return;
                }

                const handler = this.handlers.get(broadcastMsg.to);
                if (handler) {
                    await handler(broadcastMsg.message);
                }
            } else if (broadcastMsg.type === 'channel') {
                // Channel broadcast
                if (!broadcastMsg.channel) {
                    return;
                }

                const members = this.channelMemberships.get(broadcastMsg.channel);
                if (!members) {
                    return;
                }

                // Deliver to all local members
                await Promise.all(
                    Array.from(members).map(async (agentId) => {
                        const handler = this.handlers.get(agentId);
                        if (handler) {
                            await handler(broadcastMsg.message);
                        }
                    })
                );
            }
        } catch (error) {
            this.handleError(error as Error);
        }
    }
}
