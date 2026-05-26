/**
 * Tool Format Compression System
 *
 * Tool descriptions consume significant tokens when sent to LLMs. This module
 * provides tiered compression strategies so applications can trade clarity for
 * token savings based on model intelligence. Smart models (Opus/GPT-4) need
 * less hand-holding and can use 'proto' format; weaker models need 'verbose'.
 */

/**
 * Tool verbosity levels - from most compressed to most verbose
 */
export type ToolFormatLevel =
    | 'proto'      // Ultra-compressed, cryptic (90% token reduction) - for expensive/smart models
    | 'compact'    // Brief but clear (70% token reduction) - balanced
    | 'standard'   // Concise descriptions (50% token reduction) - default
    | 'verbose';   // Full context with examples (0% reduction) - for local/weak models

/**
 * Base tool definition
 */
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, {
            type: string;
            description?: string;
            enum?: string[];
            items?: any;
            [key: string]: any;
        }>;
        required?: string[];
    };
}

/**
 * Compressed tool formats for different verbosity levels
 */
export interface ToolFormatStrategies {
    proto: (tool: ToolDefinition) => ToolDefinition;
    compact: (tool: ToolDefinition) => ToolDefinition;
    standard: (tool: ToolDefinition) => ToolDefinition;
    verbose: (tool: ToolDefinition) => ToolDefinition;
}

/**
 * Proto format: Ultra-compressed, assumes high model intelligence
 * Uses abbreviations, minimal punctuation, dense structure
 *
 * Best for: Claude Opus, GPT-4, other high-capability models
 * Token savings: ~90%
 */
function compressToProto(tool: ToolDefinition): ToolDefinition {
    // Ultra-minimal - just essential info
    const desc = tool.description
        .replace(/\b(the|a|an|to|for|of|in|on|at|by)\b/gi, '') // Remove articles/prepositions
        .replace(/\s+/g, ' ') // Collapse whitespace
        .replace(/\.\s+/g, '. ') // Minimal punctuation
        .substring(0, 100); // Hard cap

    // Compress parameter descriptions too
    const compressedParams = { ...tool.parameters };
    Object.keys(compressedParams.properties).forEach(key => {
        const prop = compressedParams.properties[key];
        if (prop.description) {
            prop.description = prop.description.substring(0, 30);
        }
    });

    return {
        name: tool.name,
        description: desc,
        parameters: compressedParams
    };
}

/**
 * Compact format: Brief but intelligible
 * Removes examples, uses terse language
 *
 * Best for: Claude Sonnet, GPT-3.5, mid-tier models
 * Token savings: ~70%
 */
function compressToCompact(tool: ToolDefinition): ToolDefinition {
    // Remove examples, verbose explanations, keep core meaning
    const desc = tool.description
        .split(/EXAMPLE|USE THIS|DO NOT|WHEN TO USE|TEMPLATE/i)[0] // Cut after first section marker
        .replace(/\n\n+/g, ' ') // Collapse paragraphs
        .replace(/\s+/g, ' ')
        .trim();

    return {
        name: tool.name,
        description: desc,
        parameters: tool.parameters
    };
}

/**
 * Standard format: Concise but clear
 * Single-sentence descriptions, no fluff
 *
 * Best for: Most production use cases, balanced token/clarity
 * Token savings: ~50%
 */
function compressToStandard(tool: ToolDefinition): ToolDefinition {
    // Keep first 1-2 sentences, remove examples and verbose sections
    const sentences = tool.description.split(/\. |\n\n/);
    const desc = sentences.slice(0, 2).join('. ').trim() + '.';

    return {
        name: tool.name,
        description: desc,
        parameters: tool.parameters
    };
}

/**
 * Verbose format: Full context with examples
 * Original descriptions with all guidance
 *
 * Best for: Local models, fine-tuned models, debugging
 * Token savings: 0%
 */
function compressToVerbose(tool: ToolDefinition): ToolDefinition {
    // Return original - no compression
    return tool;
}

/**
 * Main tool format registry
 */
export const ToolFormats: ToolFormatStrategies = {
    proto: compressToProto,
    compact: compressToCompact,
    standard: compressToStandard,
    verbose: compressToVerbose
};

/**
 * Apply format to a tool definition
 *
 * @param tool - Original tool definition
 * @param format - Desired compression level
 * @returns Formatted tool definition
 *
 * @example
 * ```typescript
 * const compressed = applyToolFormat(myTool, 'proto');
 * ```
 */
export function applyToolFormat(
    tool: ToolDefinition,
    format: ToolFormatLevel
): ToolDefinition {
    return ToolFormats[format](tool);
}

/**
 * Apply format to multiple tools
 *
 * @param tools - Array of tool definitions
 * @param format - Desired compression level
 * @returns Array of formatted tools
 */
export function applyToolFormats(
    tools: ToolDefinition[],
    format: ToolFormatLevel
): ToolDefinition[] {
    return tools.map(tool => applyToolFormat(tool, format));
}

/**
 * Calculate token savings estimate
 *
 * Rough estimation based on character count reduction
 *
 * @param original - Original tool
 * @param compressed - Compressed tool
 * @returns Estimated percentage saved
 */
export function estimateTokenSavings(
    original: ToolDefinition,
    compressed: ToolDefinition
): number {
    const originalChars = JSON.stringify(original).length;
    const compressedChars = JSON.stringify(compressed).length;
    return Math.round((1 - compressedChars / originalChars) * 100);
}
