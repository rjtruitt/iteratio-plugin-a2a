/**
 * BaseDeclarativeHandler - Base class for declarative message handlers
 *
 * Processes structured messages without LLM calls. Provides template method
 * pattern with validation and error handling.
 *
 * @example
 * ```typescript
 * class MyHandler extends BaseDeclarativeHandler {
 *   canHandleImpl(msg: DeclarativeMessage): boolean {
 *     return msg.type === 'execution.stats';
 *   }
 *
 *   async handleImpl(msg: DeclarativeMessage): Promise<void | DeclarativeMessage> {
 *     // Your declarative logic here
 *   }
 * }
 * ```
 */

import type { IDeclarativeHandler } from '../../types/interfaces.js';
import type { DeclarativeMessage } from '../../types/messages.js';

export interface HandlerMetrics {
    messagesHandled: number;
    messagesSkipped: number;
    errors: number;
    lastError?: Error;
    averageHandleTimeMs: number;
}

export interface HandlerConfig {
    /** Handler name for debugging */
    name?: string;
    /** Enable metrics collection */
    collectMetrics?: boolean;
    /** Maximum execution time in milliseconds */
    maxExecutionTime?: number;
}

/**
 * Abstract base class for declarative message handlers
 */
export abstract class BaseDeclarativeHandler implements IDeclarativeHandler {
    protected readonly config: Required<HandlerConfig>;
    protected metrics: HandlerMetrics;
    private handleTimes: number[];

    constructor(config: HandlerConfig = {}) {
        this.config = {
            name: config.name || this.constructor.name,
            collectMetrics: config.collectMetrics ?? true,
            maxExecutionTime: config.maxExecutionTime ?? 5000 // 5 seconds
        };

        this.metrics = {
            messagesHandled: 0,
            messagesSkipped: 0,
            errors: 0,
            averageHandleTimeMs: 0
        };

        this.handleTimes = [];
    }

    /**
     * Check if this handler can process the message
     */
    canHandle(message: DeclarativeMessage): boolean {
        try {
            this.validateMessage(message);
            return this.canHandleImpl(message);
        } catch (error) {
            // Validation errors mean we can't handle
            return false;
        }
    }

    /**
     * Handle message with validation and metrics
     */
    async handle(message: DeclarativeMessage): Promise<void | DeclarativeMessage> {
        // Validate we can handle this
        if (!this.canHandle(message)) {
            if (this.config.collectMetrics) {
                this.metrics.messagesSkipped++;
            }
            throw new Error(`Handler ${this.config.name} cannot process message type: ${message.type}`);
        }

        const startTime = Date.now();

        try {
            // Execute with timeout
            const result = await this.executeWithTimeout(
                () => this.handleImpl(message),
                this.config.maxExecutionTime
            );

            // Update metrics
            if (this.config.collectMetrics) {
                this.metrics.messagesHandled++;
                this.updateAverageHandleTime(Date.now() - startTime);
            }

            return result;
        } catch (error) {
            this.handleError(error as Error);
            throw error;
        }
    }

    /**
     * Get handler metrics
     */
    getMetrics(): HandlerMetrics {
        return { ...this.metrics };
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            messagesHandled: 0,
            messagesSkipped: 0,
            errors: 0,
            averageHandleTimeMs: 0
        };
        this.handleTimes = [];
    }

    /**
     * Get handler name
     */
    getName(): string {
        return this.config.name;
    }

    // Template methods - subclasses must implement these

    /**
     * Check if handler can process message (implementation)
     */
    protected abstract canHandleImpl(message: DeclarativeMessage): boolean;

    /**
     * Handle message (implementation)
     */
    protected abstract handleImpl(message: DeclarativeMessage): Promise<void | DeclarativeMessage>;

    // Helper methods

    /**
     * Validate message structure
     */
    protected validateMessage(message: DeclarativeMessage): void {
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
     * Execute operation with timeout
     */
    protected async executeWithTimeout<T>(
        operation: () => Promise<T>,
        timeoutMs: number
    ): Promise<T> {
        return Promise.race([
            operation(),
            new Promise<T>((_, reject) =>
                setTimeout(
                    () => reject(new Error(`Handler ${this.config.name} timed out after ${timeoutMs}ms`)),
                    timeoutMs
                )
            )
        ]);
    }

    /**
     * Update average handle time
     */
    private updateAverageHandleTime(handleTime: number): void {
        this.handleTimes.push(handleTime);

        // Keep last 100 measurements
        if (this.handleTimes.length > 100) {
            this.handleTimes.shift();
        }

        // Calculate average
        const sum = this.handleTimes.reduce((a, b) => a + b, 0);
        this.metrics.averageHandleTimeMs = Math.round(sum / this.handleTimes.length);
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
