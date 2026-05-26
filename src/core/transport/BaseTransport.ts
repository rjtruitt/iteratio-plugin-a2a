/**
 * BaseTransport - Abstract base class for all transport implementations
 *
 * Provides common functionality like validation, logging, and metrics.
 * Subclasses implement transport-specific message delivery.
 *
 * @example
 * ```typescript
 * class MyTransport extends BaseTransport {
 *   protected async sendImpl(from: string, to: string, message: Message): Promise<void> {
 *     // Your transport logic here
 *   }
 *   protected async publishImpl(channel: string, message: Message): Promise<void> {
 *     // Your broadcast logic here
 *   }
 * }
 * ```
 */

import type { ITransport } from '../../types/interfaces.js';
import type { Message } from '../../types/messages.js';

export interface TransportMetrics {
    messagesSent: number;
    messagesPublished: number;
    messagesDelivered: number;
    errors: number;
    lastError?: Error;
}

export interface TransportConfig {
    /** Enable validation of messages before sending */
    validate?: boolean;
    /** Enable metrics collection */
    collectMetrics?: boolean;
    /** Maximum message size in bytes (default: 1MB) */
    maxMessageSize?: number;
    /** Timeout for send operations in milliseconds */
    sendTimeout?: number;
}

/**
 * Abstract base class for transport implementations
 */
export abstract class BaseTransport implements ITransport {
    protected readonly config: Required<TransportConfig>;
    protected metrics: TransportMetrics;
    protected subscriptions: Map<string, (message: Message) => void | Promise<void>>;

    constructor(config: TransportConfig = {}) {
        this.config = {
            validate: config.validate ?? true,
            collectMetrics: config.collectMetrics ?? true,
            maxMessageSize: config.maxMessageSize ?? 1024 * 1024, // 1MB
            sendTimeout: config.sendTimeout ?? 30000 // 30 seconds
        };

        this.metrics = {
            messagesSent: 0,
            messagesPublished: 0,
            messagesDelivered: 0,
            errors: 0
        };

        this.subscriptions = new Map();
    }

    /**
     * Send direct message to specific agent
     */
    async send(from: string, to: string, message: Message): Promise<void> {
        // Validate inputs
        if (this.config.validate) {
            this.validateAgentId(from, 'from');
            this.validateAgentId(to, 'to');
            this.validateMessage(message);
        }

        try {
            // Check message size
            const messageSize = this.estimateMessageSize(message);
            if (messageSize > this.config.maxMessageSize) {
                throw new Error(
                    `Message size (${messageSize} bytes) exceeds maximum (${this.config.maxMessageSize} bytes)`
                );
            }

            // Execute with timeout
            await this.executeWithTimeout(
                () => this.sendImpl(from, to, message),
                this.config.sendTimeout,
                'send'
            );

            // Update metrics
            if (this.config.collectMetrics) {
                this.metrics.messagesSent++;
            }
        } catch (error) {
            this.handleError(error as Error);
            throw error;
        }
    }

    /**
     * Publish message to channel (broadcast to all members)
     */
    async publish(channel: string, message: Message): Promise<void> {
        // Validate inputs
        if (this.config.validate) {
            this.validateChannelName(channel);
            this.validateMessage(message);
        }

        try {
            // Check message size
            const messageSize = this.estimateMessageSize(message);
            if (messageSize > this.config.maxMessageSize) {
                throw new Error(
                    `Message size (${messageSize} bytes) exceeds maximum (${this.config.maxMessageSize} bytes)`
                );
            }

            // Execute with timeout
            await this.executeWithTimeout(
                () => this.publishImpl(channel, message),
                this.config.sendTimeout,
                'publish'
            );

            // Update metrics
            if (this.config.collectMetrics) {
                this.metrics.messagesPublished++;
            }
        } catch (error) {
            this.handleError(error as Error);
            throw error;
        }
    }

    /**
     * Subscribe to messages for specific agent
     */
    async subscribe(agentId: string, handler: (message: Message) => void | Promise<void>): Promise<void> {
        if (this.config.validate) {
            this.validateAgentId(agentId, 'agentId');
        }

        // Wrap handler to track deliveries
        const wrappedHandler = async (message: Message): Promise<void> => {
            try {
                await handler(message);
                if (this.config.collectMetrics) {
                    this.metrics.messagesDelivered++;
                }
            } catch (error) {
                this.handleError(error as Error);
                throw error;
            }
        };

        this.subscriptions.set(agentId, wrappedHandler);
        await this.subscribeImpl(agentId, wrappedHandler);
    }

    /**
     * Unsubscribe from messages
     */
    async unsubscribe(agentId: string): Promise<void> {
        if (this.config.validate) {
            this.validateAgentId(agentId, 'agentId');
        }

        this.subscriptions.delete(agentId);
        await this.unsubscribeImpl(agentId);
    }

    /**
     * Disconnect agent from transport
     */
    async disconnect(agentId: string): Promise<void> {
        if (this.config.validate) {
            this.validateAgentId(agentId, 'agentId');
        }

        await this.unsubscribe(agentId);
        await this.disconnectImpl(agentId);
    }

    /**
     * Get list of connected agents
     */
    async getConnected(): Promise<string[]> {
        return this.getConnectedImpl();
    }

    /**
     * Get transport metrics
     */
    getMetrics(): TransportMetrics {
        return { ...this.metrics };
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            messagesSent: 0,
            messagesPublished: 0,
            messagesDelivered: 0,
            errors: 0
        };
    }

    // Template methods - subclasses must implement these

    /**
     * Send message implementation
     */
    protected abstract sendImpl(from: string, to: string, message: Message): Promise<void>;

    /**
     * Publish message implementation
     */
    protected abstract publishImpl(channel: string, message: Message): Promise<void>;

    /**
     * Subscribe implementation
     */
    protected abstract subscribeImpl(agentId: string, handler: (message: Message) => void | Promise<void>): Promise<void>;

    /**
     * Unsubscribe implementation
     */
    protected abstract unsubscribeImpl(agentId: string): Promise<void>;

    /**
     * Disconnect implementation
     */
    protected abstract disconnectImpl(agentId: string): Promise<void>;

    /**
     * Get connected agents implementation
     */
    protected abstract getConnectedImpl(): Promise<string[]>;

    // Helper methods

    /**
     * Validate agent ID
     */
    protected validateAgentId(agentId: string, paramName: string): void {
        if (!agentId || typeof agentId !== 'string' || agentId.trim().length === 0) {
            throw new Error(`Invalid ${paramName}: must be non-empty string`);
        }
    }

    /**
     * Validate channel name
     */
    protected validateChannelName(channel: string): void {
        if (!channel || typeof channel !== 'string' || channel.trim().length === 0) {
            throw new Error('Invalid channel: must be non-empty string');
        }
        // IRC-style channels start with #
        if (!channel.startsWith('#')) {
            throw new Error('Invalid channel: must start with #');
        }
    }

    /**
     * Validate message structure
     */
    protected validateMessage(message: Message): void {
        if (!message || typeof message !== 'object') {
            throw new Error('Invalid message: must be object');
        }
        if (!message.id || typeof message.id !== 'string') {
            throw new Error('Invalid message: missing or invalid id');
        }
        if (!message.from || typeof message.from !== 'string') {
            throw new Error('Invalid message: missing or invalid from');
        }
        if (typeof message.timestamp !== 'number') {
            throw new Error('Invalid message: missing or invalid timestamp');
        }
        if (!message.type || typeof message.type !== 'string') {
            throw new Error('Invalid message: missing or invalid type');
        }
    }

    /**
     * Estimate message size in bytes
     */
    protected estimateMessageSize(message: Message): number {
        return JSON.stringify(message).length;
    }

    /**
     * Execute operation with timeout
     */
    protected async executeWithTimeout<T>(
        operation: () => Promise<T>,
        timeoutMs: number,
        operationName: string
    ): Promise<T> {
        return Promise.race([
            operation(),
            new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs)
            )
        ]);
    }

    /**
     * Handle error
     */
    protected handleError(error: Error): void {
        if (this.config.collectMetrics) {
            this.metrics.errors++;
            this.metrics.lastError = error;
        }
    }
}
