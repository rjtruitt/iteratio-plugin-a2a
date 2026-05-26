/**
 * InMemoryCoordinationMemory - Simple in-memory pattern storage
 *
 * Fast, synchronous storage for coordination patterns. Perfect for testing,
 * development, and small-scale deployments.
 *
 * @example
 * ```typescript
 * const memory = new InMemoryCoordinationMemory();
 *
 * // Store pattern
 * const id = await memory.store({
 *   id: '1',
 *   scenario: 'code-review',
 *   approach: 'Spawned 3 workers: security, docs, tests',
 *   outcome: 'success',
 *   metadata: { tokensUsed: 25000 }
 * });
 *
 * // Search patterns
 * const results = await memory.search('security', { limit: 5 });
 * ```
 */

import { BaseCoordinationMemory, MemoryConfig } from './BaseCoordinationMemory.js';
import type { CoordinationPattern, MemorySearchOptions } from '../../types/memory.js';

/**
 * In-memory coordination pattern storage
 */
export class InMemoryCoordinationMemory extends BaseCoordinationMemory {
    private patterns: Map<string, CoordinationPattern>;

    constructor(config?: MemoryConfig) {
        super(config);
        this.patterns = new Map();
    }

    protected async storeImpl(pattern: CoordinationPattern): Promise<string> {
        this.patterns.set(pattern.id, pattern);
        return pattern.id;
    }

    protected async searchImpl(query: string, options?: MemorySearchOptions): Promise<CoordinationPattern[]> {
        const queryLower = query.toLowerCase();
        const results: Array<{ pattern: CoordinationPattern; score: number }> = [];

        // Simple text search with scoring
        for (const pattern of this.patterns.values()) {
            let score = 0;

            // Search in scenario
            if (pattern.scenario.toLowerCase().includes(queryLower)) {
                score += 10;
            }

            // Search in approach
            if (pattern.approach.toLowerCase().includes(queryLower)) {
                score += 5;
            }

            // Search in tags
            if (pattern.metadata?.tags) {
                const tags = pattern.metadata.tags as string[];
                if (tags.some(tag => tag.toLowerCase().includes(queryLower))) {
                    score += 3;
                }
            }

            // Filter by outcome if specified
            if (options?.outcome && pattern.outcome !== options.outcome) {
                continue;
            }

            // Filter by tags if specified
            if (options?.tags) {
                const patternTags = (pattern.metadata?.tags as string[]) || [];
                const hasAllTags = options.tags.every(tag =>
                    patternTags.some(pt => pt.toLowerCase().includes(tag.toLowerCase()))
                );
                if (!hasAllTags) {
                    continue;
                }
            }

            // Filter by date range if specified
            if (options?.after || options?.before) {
                const timestamp = pattern.metadata?.timestamp as number | undefined;
                if (timestamp) {
                    if (options.after && timestamp < options.after) {
                        continue;
                    }
                    if (options.before && timestamp > options.before) {
                        continue;
                    }
                }
            }

            if (score > 0) {
                results.push({ pattern, score });
            }
        }

        // Sort by score (descending)
        results.sort((a, b) => b.score - a.score);

        // Apply limit
        const limit = options?.limit ?? 10;
        return results.slice(0, limit).map(r => r.pattern);
    }

    protected async getImpl(id: string): Promise<CoordinationPattern | null> {
        return this.patterns.get(id) || null;
    }

    protected async updateImpl(id: string, updates: Partial<CoordinationPattern>): Promise<void> {
        const existing = this.patterns.get(id);
        if (!existing) {
            throw new Error(`Pattern not found: ${id}`);
        }

        const updated = { ...existing, ...updates, id }; // Ensure ID doesn't change
        this.patterns.set(id, updated);
    }

    protected async deleteImpl(id: string): Promise<void> {
        this.patterns.delete(id);
    }

    /**
     * Store pattern in agent-specific namespace
     */
    async storeInNamespace(namespace: string, pattern: CoordinationPattern): Promise<string> {
        const namespacedId = `${namespace}:${pattern.id}`;
        const namespacedPattern = { ...pattern, id: namespacedId, _namespace: namespace };
        this.patterns.set(namespacedId, namespacedPattern as CoordinationPattern);
        return namespacedId;
    }

    /**
     * Get pattern from agent-specific namespace
     */
    async getFromNamespace(namespace: string, id: string): Promise<CoordinationPattern | null> {
        const namespacedId = `${namespace}:${id}`;
        const pattern = this.patterns.get(namespacedId);
        return pattern || null;
    }

    /**
     * Get all patterns (for testing/debugging)
     */
    getAll(): CoordinationPattern[] {
        return Array.from(this.patterns.values());
    }

    /**
     * Get pattern count
     */
    getCount(): number {
        return this.patterns.size;
    }

    /**
     * Clear all patterns
     */
    clear(): void {
        this.patterns.clear();
        this.clearCache();
    }

    /**
     * Get patterns by outcome
     */
    async getByOutcome(outcome: 'success' | 'failure' | 'partial'): Promise<CoordinationPattern[]> {
        return Array.from(this.patterns.values()).filter(p => p.outcome === outcome);
    }

    /**
     * Get patterns by scenario
     */
    async getByScenario(scenario: string): Promise<CoordinationPattern[]> {
        return Array.from(this.patterns.values()).filter(p => p.scenario === scenario);
    }

    /**
     * Get success rate for scenario
     */
    async getSuccessRate(scenario: string): Promise<number> {
        const scenarioPatterns = await this.getByScenario(scenario);
        if (scenarioPatterns.length === 0) {
            return 0;
        }

        const successCount = scenarioPatterns.filter(p => p.outcome === 'success').length;
        return Math.round((successCount / scenarioPatterns.length) * 100);
    }

    /**
     * Get statistics
     */
    getStats(): {
        totalPatterns: number;
        successPatterns: number;
        failurePatterns: number;
        partialPatterns: number;
        uniqueScenarios: number;
    } {
        const patterns = Array.from(this.patterns.values());
        const scenarios = new Set(patterns.map(p => p.scenario));

        return {
            totalPatterns: patterns.length,
            successPatterns: patterns.filter(p => p.outcome === 'success').length,
            failurePatterns: patterns.filter(p => p.outcome === 'failure').length,
            partialPatterns: patterns.filter(p => p.outcome === 'partial').length,
            uniqueScenarios: scenarios.size
        };
    }
}
