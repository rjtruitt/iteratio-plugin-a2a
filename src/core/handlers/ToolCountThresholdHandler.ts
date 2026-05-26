/**
 * ToolCountThresholdHandler - Monitors tool usage and triggers warnings
 *
 * Example of a concrete declarative handler. Tracks tool counts and emits
 * trigger messages when thresholds are exceeded.
 *
 * @example
 * ```typescript
 * const handler = new ToolCountThresholdHandler({
 *   threshold: 50,
 *   action: 'warn'
 * });
 *
 * const result = await handler.handle(statsMessage);
 * // Returns trigger message if threshold exceeded
 * ```
 */

import { BaseDeclarativeHandler, HandlerConfig } from './BaseDeclarativeHandler.js';
import type { DeclarativeMessage } from '../../types/messages.js';
import type { TriggerMessages } from '../../types/messages.js';

export interface ToolCountConfig extends HandlerConfig {
    /** Tool count threshold */
    threshold: number;
    /** Action when threshold exceeded */
    action?: 'warn' | 'pause' | 'escalate';
}

/**
 * Handler for tool count threshold monitoring
 */
export class ToolCountThresholdHandler extends BaseDeclarativeHandler {
    private threshold: number;
    private action: 'warn' | 'pause' | 'escalate';
    private currentCount: number = 0;

    constructor(config: ToolCountConfig) {
        super({
            name: config.name || 'ToolCountThresholdHandler',
            collectMetrics: config.collectMetrics,
            maxExecutionTime: config.maxExecutionTime
        });

        this.threshold = config.threshold;
        this.action = config.action || 'warn';
    }

    protected canHandleImpl(message: DeclarativeMessage): boolean {
        return message.type === 'execution.stats';
    }

    protected async handleImpl(message: DeclarativeMessage): Promise<void | DeclarativeMessage> {
        // Type guard - we know it's execution.stats from canHandleImpl
        if (message.type !== 'execution.stats') {
            return;
        }

        // Extract tool count from message
        const statsMessage = message as any; // DeclarativeMessages.ExecutionStats
        if (typeof statsMessage.toolCallCount !== 'number') {
            throw new Error('Invalid execution.stats message: missing toolCallCount');
        }

        this.currentCount = statsMessage.toolCallCount;

        // Check threshold
        if (this.currentCount > this.threshold) {
            // Create trigger message
            const trigger: TriggerMessages.ToolCountThreshold = {
                id: `trigger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                from: this.config.name,
                timestamp: Date.now(),
                type: 'trigger.toolcount',
                current: this.currentCount,
                threshold: this.threshold,
                exceeded: true,
                action: this.action
            };

            return trigger;
        }

        // Threshold not exceeded - no trigger
        return;
    }

    /**
     * Get current tool count
     */
    getCurrentCount(): number {
        return this.currentCount;
    }

    /**
     * Get threshold
     */
    getThreshold(): number {
        return this.threshold;
    }

    /**
     * Update threshold
     */
    setThreshold(threshold: number): void {
        if (threshold < 0) {
            throw new Error('Threshold must be non-negative');
        }
        this.threshold = threshold;
    }

    /**
     * Reset count
     */
    resetCount(): void {
        this.currentCount = 0;
    }
}
