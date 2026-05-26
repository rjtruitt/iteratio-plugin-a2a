/**
 * Auto-Select Tool Format Example
 *
 * Application-level policy for choosing tool format based on model capability.
 * This logic lives in YOUR app (dispatch), not in hive-orchestrator library.
 */

import { ToolFormatLevel } from '../src/types/tool-formats.js';

/**
 * Select optimal tool format based on model ID
 *
 * This is YOUR business logic - customize for your needs!
 *
 * @param modelId - The LLM model identifier
 * @returns Recommended tool format level
 */
export function selectToolFormatForModel(modelId: string): ToolFormatLevel {
    const id = modelId.toLowerCase();

    // Ultra-expensive, ultra-capable models → max compression
    if (
        id.includes('opus') ||
        id.includes('gpt-4') ||
        id.includes('claude-4') ||
        id.includes('sonnet-4')
    ) {
        return 'proto'; // 90% reduction - these models understand anything
    }

    // Mid-tier models → balanced compression
    if (
        id.includes('sonnet-3') ||
        id.includes('haiku') ||
        id.includes('gpt-3.5') ||
        id.includes('gemini-pro')
    ) {
        return 'compact'; // 70% reduction - clear but brief
    }

    // Local or weaker models → more context
    if (
        id.includes('llama') ||
        id.includes('mistral') ||
        id.includes('local') ||
        id.includes('7b') ||
        id.includes('13b')
    ) {
        return 'verbose'; // Full descriptions
    }

    // Default: standard format for unknown models
    return 'standard';
}

/**
 * Select based on model cost
 *
 * Alternative strategy: optimize by cost rather than capability
 */
export function selectToolFormatByCost(
    inputCostPerMToken: number
): ToolFormatLevel {
    if (inputCostPerMToken > 2.0) {
        return 'proto'; // Expensive → max compression
    }
    if (inputCostPerMToken > 0.5) {
        return 'compact'; // Mid-cost → balanced
    }
    if (inputCostPerMToken > 0.1) {
        return 'standard'; // Cheap → default
    }
    return 'verbose'; // Practically free (local) → full context
}

/**
 * Select based on usage patterns
 *
 * Strategy: compress more for high-volume agents
 */
export function selectToolFormatByVolume(
    estimatedDailyRequests: number
): ToolFormatLevel {
    if (estimatedDailyRequests > 1000) {
        return 'proto'; // High volume → save every token
    }
    if (estimatedDailyRequests > 100) {
        return 'compact'; // Medium volume → balanced
    }
    return 'standard'; // Low volume → default
}

/**
 * Combined strategy example
 *
 * Use multiple factors to decide
 */
export function selectToolFormatSmart(context: {
    modelId: string;
    costPerMToken: number;
    dailyVolume: number;
    agentType: 'orchestrator' | 'worker';
}): ToolFormatLevel {
    // Orchestrators make many calls → compress more
    if (context.agentType === 'orchestrator') {
        if (context.dailyVolume > 500 || context.costPerMToken > 2.0) {
            return 'proto';
        }
        return 'compact';
    }

    // Workers are often one-shot → can be more verbose
    if (context.costPerMToken < 0.5) {
        return 'standard';
    }

    return 'compact';
}

// ============================================================================
// Usage Example in Dispatch
// ============================================================================

/**
 * Example: Integrating with your dispatch application
 */
/*
import { Orchestrator, applyToolFormats } from 'hive-orchestrator';
import { selectToolFormatForModel } from './auto-select-tool-format';

// Your model config
const modelId = 'claude-opus-4';
const costPerMToken = 15.0;

// Application decides format
const format = selectToolFormatForModel(modelId);

// Define tools (verbose by default)
const tools = [
    { name: 'spawn_worker', description: 'Long description...', ... },
    { name: 'cancel_worker', description: 'Another long description...', ... },
];

// Apply compression
const compressedTools = applyToolFormats(tools, format);

// Create orchestrator with compressed tools
const orchestrator = new Orchestrator({
    modelId,
    tools: compressedTools,
    toolFormat: format // Store for reference
});

console.log(`Using ${format} format for ${modelId}`);
console.log(`Estimated token savings: ~${format === 'proto' ? '90' : '70'}%`);
*/

// ============================================================================
// Testing
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('=== Tool Format Auto-Selection Examples ===\n');

    const testModels = [
        'claude-opus-4',
        'claude-sonnet-4',
        'claude-haiku-4',
        'gpt-4',
        'gpt-3.5-turbo',
        'llama-70b-local',
        'mistral-7b'
    ];

    testModels.forEach(model => {
        const format = selectToolFormatForModel(model);
        console.log(`${model.padEnd(25)} → ${format}`);
    });

    console.log('\n=== Cost-Based Selection ===\n');
    [0.05, 0.5, 3.0, 15.0].forEach(cost => {
        const format = selectToolFormatByCost(cost);
        console.log(`$${cost.toFixed(2)}/M tokens`.padEnd(20) + ` → ${format}`);
    });
}
