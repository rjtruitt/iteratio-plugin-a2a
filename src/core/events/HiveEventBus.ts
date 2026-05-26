/**
 * HiveEventBus - Event system for cross-cutting concerns
 *
 * Decouples event producers from consumers. Similar to Node.js EventEmitter
 * but with typed events and metrics.
 *
 * @example
 * ```typescript
 * const bus = new HiveEventBus();
 *
 * bus.on('agent.spawned', (event) => {
 *   console.log('Agent spawned:', event.data);
 * });
 *
 * bus.emit({
 *   id: '1',
 *   type: 'agent.spawned',
 *   timestamp: Date.now(),
 *   source: 'manager',
 *   data: { agentId: 'worker-1' }
 * });
 * ```
 */

export interface HiveEvent {
    /** Unique event ID */
    id: string;
    /** Event type (e.g., 'agent.spawned', 'threshold.exceeded') */
    type: string;
    /** Event timestamp */
    timestamp: number;
    /** Event source (agent ID, component name, etc.) */
    source: string;
    /** Event data */
    data: unknown;
}

export interface EventHandler {
    (event: HiveEvent): void | Promise<void>;
}

export interface EventBusMetrics {
    totalEvents: number;
    eventsByType: Map<string, number>;
    errors: number;
    lastError?: Error;
}

export interface EventBusConfig {
    /** Enable metrics collection */
    collectMetrics?: boolean;
    /** Maximum handlers per event type */
    maxHandlersPerEvent?: number;
    /** Enable async event handling */
    async?: boolean;
}

/**
 * Event bus for hive orchestration events
 */
export class HiveEventBus {
    private handlers: Map<string, Set<EventHandler>>;
    private wildcardHandlers: Set<EventHandler>;
    private config: Required<EventBusConfig>;
    private metrics: EventBusMetrics;

    constructor(config: EventBusConfig = {}) {
        this.handlers = new Map();
        this.wildcardHandlers = new Set();
        this.config = {
            collectMetrics: config.collectMetrics ?? true,
            maxHandlersPerEvent: config.maxHandlersPerEvent ?? 100,
            async: config.async ?? true
        };
        this.metrics = {
            totalEvents: 0,
            eventsByType: new Map(),
            errors: 0
        };
    }

    /**
     * Register event handler
     */
    on(eventType: string, handler: EventHandler): this {
        // Handle wildcard subscriptions
        if (eventType === '*') {
            this.wildcardHandlers.add(handler);
            return this;
        }

        // Get or create handler set for this event type
        let handlerSet = this.handlers.get(eventType);
        if (!handlerSet) {
            handlerSet = new Set();
            this.handlers.set(eventType, handlerSet);
        }

        // Check max handlers limit
        if (handlerSet.size >= this.config.maxHandlersPerEvent) {
            throw new Error(
                `Maximum handlers (${this.config.maxHandlersPerEvent}) exceeded for event type: ${eventType}`
            );
        }

        handlerSet.add(handler);
        return this;
    }

    /**
     * Register one-time event handler (auto-removes after first trigger)
     */
    once(eventType: string, handler: EventHandler): this {
        const wrappedHandler: EventHandler = async (event: HiveEvent) => {
            await handler(event);
            this.off(eventType, wrappedHandler);
        };

        return this.on(eventType, wrappedHandler);
    }

    /**
     * Unregister event handler
     */
    off(eventType: string, handler: EventHandler): this {
        if (eventType === '*') {
            this.wildcardHandlers.delete(handler);
            return this;
        }

        const handlerSet = this.handlers.get(eventType);
        if (handlerSet) {
            handlerSet.delete(handler);
            // Clean up empty sets
            if (handlerSet.size === 0) {
                this.handlers.delete(eventType);
            }
        }

        return this;
    }

    /**
     * Remove all handlers for event type
     */
    removeAllListeners(eventType?: string): this {
        if (eventType === undefined) {
            // Remove all
            this.handlers.clear();
            this.wildcardHandlers.clear();
        } else if (eventType === '*') {
            this.wildcardHandlers.clear();
        } else {
            this.handlers.delete(eventType);
        }

        return this;
    }

    /**
     * Emit event to handlers
     */
    emit(event: HiveEvent): void {
        // Update metrics
        if (this.config.collectMetrics) {
            this.metrics.totalEvents++;
            const count = this.metrics.eventsByType.get(event.type) || 0;
            this.metrics.eventsByType.set(event.type, count + 1);
        }

        // Validate event
        this.validateEvent(event);

        // Get handlers for this event type
        const typeHandlers = this.handlers.get(event.type) || new Set();
        const allHandlers = [...typeHandlers, ...this.wildcardHandlers];

        if (allHandlers.length === 0) {
            return; // No handlers registered
        }

        // Execute handlers
        if (this.config.async) {
            // Async - fire and forget
            this.executeHandlersAsync(allHandlers, event);
        } else {
            // Sync - wait for all handlers
            this.executeHandlersSync(allHandlers, event);
        }
    }

    /**
     * Wait for specific event
     */
    async waitFor(eventType: string, timeoutMs?: number): Promise<HiveEvent> {
        return new Promise((resolve, reject) => {
            let timeoutId: NodeJS.Timeout | undefined;

            const handler: EventHandler = (event: HiveEvent) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                resolve(event);
            };

            this.once(eventType, handler);

            if (timeoutMs) {
                timeoutId = setTimeout(() => {
                    this.off(eventType, handler);
                    reject(new Error(`Timeout waiting for event: ${eventType}`));
                }, timeoutMs);
            }
        });
    }

    /**
     * Get handler count for event type
     */
    listenerCount(eventType: string): number {
        if (eventType === '*') {
            return this.wildcardHandlers.size;
        }
        return this.handlers.get(eventType)?.size || 0;
    }

    /**
     * Get all event types with handlers
     */
    eventNames(): string[] {
        return Array.from(this.handlers.keys());
    }

    /**
     * Get metrics
     */
    getMetrics(): EventBusMetrics {
        return {
            ...this.metrics,
            eventsByType: new Map(this.metrics.eventsByType)
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            totalEvents: 0,
            eventsByType: new Map(),
            errors: 0
        };
    }

    // Private methods

    private validateEvent(event: HiveEvent): void {
        if (!event || typeof event !== 'object') {
            throw new Error('Invalid event: must be object');
        }
        if (!event.id || typeof event.id !== 'string') {
            throw new Error('Invalid event: missing or invalid id');
        }
        if (!event.type || typeof event.type !== 'string') {
            throw new Error('Invalid event: missing or invalid type');
        }
        if (typeof event.timestamp !== 'number') {
            throw new Error('Invalid event: missing or invalid timestamp');
        }
        if (!event.source || typeof event.source !== 'string') {
            throw new Error('Invalid event: missing or invalid source');
        }
    }

    private async executeHandlersAsync(handlers: EventHandler[], event: HiveEvent): Promise<void> {
        // Fire and forget - don't wait for handlers to complete
        Promise.all(
            handlers.map(async handler => {
                try {
                    await handler(event);
                } catch (error) {
                    this.handleError(error as Error);
                }
            })
        ).catch(() => {
            // Ignore - errors already handled individually
        });
    }

    private executeHandlersSync(handlers: EventHandler[], event: HiveEvent): void {
        for (const handler of handlers) {
            try {
                const result = handler(event);
                // Handle promises synchronously
                if (result instanceof Promise) {
                    result.catch(error => this.handleError(error));
                }
            } catch (error) {
                this.handleError(error as Error);
            }
        }
    }

    private handleError(error: Error): void {
        if (this.config.collectMetrics) {
            this.metrics.errors++;
            this.metrics.lastError = error;
        }
        // Optionally emit error event (avoid infinite loop)
        if (error.message !== 'Error in event handler') {
            console.error('Error in event handler:', error);
        }
    }
}
