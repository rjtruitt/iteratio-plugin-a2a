/**
 * DeclarativeHandlerChain - Chain of Responsibility pattern for handlers
 *
 * Manages multiple handlers and routes messages to the first handler that can process it.
 * Similar to Express middleware or LangChain's RunnableSequence.
 *
 * @example
 * ```typescript
 * const chain = new DeclarativeHandlerChain()
 *   .addHandler(new ToolCountHandler())
 *   .addHandler(new BudgetHandler())
 *   .addHandler(new HealthCheckHandler());
 *
 * await chain.handle(message);
 * ```
 */

import type { IDeclarativeHandler } from '../../types/interfaces.js';
import type { DeclarativeMessage } from '../../types/messages.js';

export interface ChainMetrics {
    totalMessages: number;
    messagesHandled: number;
    messagesUnhandled: number;
    handlerUsage: Map<string, number>;
}

export interface ChainConfig {
    /** Stop after first handler processes message */
    stopOnFirst?: boolean;
    /** Throw error if no handler can process message */
    throwOnUnhandled?: boolean;
    /** Enable metrics collection */
    collectMetrics?: boolean;
}

/**
 * Chain of Responsibility pattern for declarative handlers
 */
export class DeclarativeHandlerChain {
    private handlers: IDeclarativeHandler[];
    private config: Required<ChainConfig>;
    private metrics: ChainMetrics;

    constructor(config: ChainConfig = {}) {
        this.handlers = [];
        this.config = {
            stopOnFirst: config.stopOnFirst ?? true,
            throwOnUnhandled: config.throwOnUnhandled ?? false,
            collectMetrics: config.collectMetrics ?? true
        };
        this.metrics = {
            totalMessages: 0,
            messagesHandled: 0,
            messagesUnhandled: 0,
            handlerUsage: new Map()
        };
    }

    /**
     * Add handler to chain
     */
    addHandler(handler: IDeclarativeHandler): this {
        this.handlers.push(handler);
        this.sortByPriority();
        return this;
    }

    /**
     * Add multiple handlers
     */
    addHandlers(...handlers: IDeclarativeHandler[]): this {
        handlers.forEach(h => this.addHandler(h));
        return this;
    }

    /**
     * Remove handler
     */
    removeHandler(handler: IDeclarativeHandler): boolean {
        const index = this.handlers.indexOf(handler);
        if (index !== -1) {
            this.handlers.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Clear all handlers
     */
    clear(): void {
        this.handlers = [];
    }

    /**
     * Get all handlers
     */
    getHandlers(): IDeclarativeHandler[] {
        return [...this.handlers];
    }

    /**
     * Handle message through chain
     */
    async handle(message: DeclarativeMessage): Promise<void | DeclarativeMessage> {
        if (this.config.collectMetrics) {
            this.metrics.totalMessages++;
        }

        let handled = false;
        let lastResult: void | DeclarativeMessage = undefined;

        for (const handler of this.handlers) {
            if (!handler.canHandle(message)) {
                continue;
            }

            try {
                lastResult = await handler.handle(message);
                handled = true;

                // Update handler usage metrics
                if (this.config.collectMetrics) {
                    const handlerName = this.getHandlerName(handler);
                    const count = this.metrics.handlerUsage.get(handlerName) || 0;
                    this.metrics.handlerUsage.set(handlerName, count + 1);
                }

                // Stop after first handler if configured
                if (this.config.stopOnFirst) {
                    break;
                }
            } catch (error) {
                // Continue to next handler on error
                continue;
            }
        }

        // Update metrics
        if (this.config.collectMetrics) {
            if (handled) {
                this.metrics.messagesHandled++;
            } else {
                this.metrics.messagesUnhandled++;
            }
        }

        // Throw if no handler processed message and configured to do so
        if (!handled && this.config.throwOnUnhandled) {
            throw new Error(`No handler found for message type: ${message.type}`);
        }

        return lastResult;
    }

    /**
     * Check if any handler can process message
     */
    canHandle(message: DeclarativeMessage): boolean {
        return this.handlers.some(h => h.canHandle(message));
    }

    /**
     * Get handlers that can process message
     */
    getHandlersForMessage(message: DeclarativeMessage): IDeclarativeHandler[] {
        return this.handlers.filter(h => h.canHandle(message));
    }

    /**
     * Get metrics
     */
    getMetrics(): ChainMetrics {
        return {
            ...this.metrics,
            handlerUsage: new Map(this.metrics.handlerUsage)
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            totalMessages: 0,
            messagesHandled: 0,
            messagesUnhandled: 0,
            handlerUsage: new Map()
        };
    }

    /**
     * Sort handlers by priority (higher priority first)
     */
    private sortByPriority(): void {
        this.handlers.sort((a, b) => {
            const pa = (a as any).priority ?? 0;
            const pb = (b as any).priority ?? 0;
            return pb - pa;
        });
    }

    /**
     * Get handler name for metrics
     */
    private getHandlerName(handler: IDeclarativeHandler): string {
        // Try to get name from BaseDeclarativeHandler
        if ('getName' in handler && typeof (handler as any).getName === 'function') {
            return (handler as any).getName();
        }
        // Fallback to constructor name
        return handler.constructor.name;
    }
}
