/**
 * AnthropicToolAdapter - Converts HiveTool to Anthropic tool use format
 *
 * Adapts universal tool definitions to Anthropic's tool use API format.
 * Compatible with Claude models via Anthropic API.
 *
 * @example
 * ```typescript
 * const adapter = new AnthropicToolAdapter();
 * const anthropicTools = adapter.adapt([myHiveTool]);
 *
 * // Use with Anthropic SDK
 * const response = await anthropic.messages.create({
 *   model: 'claude-3-opus-20240229',
 *   messages: [...],
 *   tools: anthropicTools
 * });
 * ```
 */

import { BaseToolAdapter, AdapterConfig } from '../BaseToolAdapter.js';
import type { HiveTool, HiveToolResult } from '../../../types/interfaces.js';

/**
 * Anthropic tool format
 */
export interface AnthropicTool {
    name: string;
    description: string;
    input_schema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
}

/**
 * Anthropic tool use result
 */
export interface AnthropicToolUse {
    type: 'tool_use';
    id: string;
    name: string;
    input: Record<string, unknown>;
}

/**
 * Adapter for Anthropic tool use format
 */
export class AnthropicToolAdapter extends BaseToolAdapter<AnthropicTool> {
    constructor(config?: AdapterConfig) {
        super({
            name: 'AnthropicToolAdapter',
            ...config
        });
    }

    protected adaptImpl(tool: HiveTool): AnthropicTool {
        return {
            name: tool.name,
            description: tool.description,
            input_schema: {
                type: 'object',
                properties: tool.parameters.properties,
                required: tool.parameters.required
            }
        };
    }

    /**
     * Convert Anthropic tool use result to universal format
     */
    adaptResult(toolUseResult: unknown): HiveToolResult {
        // Anthropic returns tool results as objects
        if (typeof toolUseResult === 'object' && toolUseResult !== null) {
            // Check if it's an error result
            const result = toolUseResult as any;
            if (result.error) {
                return {
                    success: false,
                    error: {
                        code: result.error.code || 'TOOL_ERROR',
                        message: result.error.message || 'Tool execution failed'
                    }
                };
            }

            // Success result
            return {
                success: true,
                data: toolUseResult
            };
        }

        // Unknown format
        return {
            success: false,
            error: {
                code: 'INVALID_RESULT',
                message: 'Tool result must be object'
            }
        };
    }

    /**
     * Execute tool use with HiveTool handler
     *
     * Helper method to execute Anthropic tool uses using original HiveTool handlers
     */
    async executeToolUse(toolUse: AnthropicToolUse, tool: HiveTool): Promise<HiveToolResult> {
        try {
            // Execute handler with input
            const result = await tool.handler(toolUse.input);
            return result;
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'EXECUTION_ERROR',
                    message: (error as Error).message
                }
            };
        }
    }

    /**
     * Format result for Anthropic tool_result content block
     */
    formatToolResult(toolUseId: string, result: HiveToolResult): {
        type: 'tool_result';
        tool_use_id: string;
        content: string;
        is_error?: boolean;
    } {
        return {
            type: 'tool_result',
            tool_use_id: toolUseId,
            content: result.success
                ? JSON.stringify(result.data)
                : result.error?.message || 'Unknown error',
            is_error: !result.success
        };
    }
}
