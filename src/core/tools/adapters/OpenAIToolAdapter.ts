/**
 * OpenAIToolAdapter - Converts HiveTool to OpenAI function calling format
 *
 * Adapts universal tool definitions to OpenAI's function calling API format.
 * Compatible with OpenAI, Azure OpenAI, and other OpenAI-compatible APIs.
 *
 * @example
 * ```typescript
 * const adapter = new OpenAIToolAdapter();
 * const openaiTools = adapter.adapt([myHiveTool]);
 *
 * // Use with OpenAI SDK
 * const response = await openai.chat.completions.create({
 *   model: 'gpt-4',
 *   messages: [...],
 *   tools: openaiTools
 * });
 * ```
 */

import { BaseToolAdapter, AdapterConfig } from '../BaseToolAdapter.js';
import type { HiveTool, HiveToolResult } from '../../../types/interfaces.js';

/**
 * OpenAI function calling tool format
 */
export interface OpenAITool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, unknown>;
            required?: string[];
        };
    };
}

/**
 * OpenAI function call result
 */
export interface OpenAIToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string; // JSON string
    };
}

/**
 * Adapter for OpenAI function calling format
 */
export class OpenAIToolAdapter extends BaseToolAdapter<OpenAITool> {
    constructor(config?: AdapterConfig) {
        super({
            name: 'OpenAIToolAdapter',
            ...config
        });
    }

    protected adaptImpl(tool: HiveTool): OpenAITool {
        return {
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: 'object',
                    properties: tool.parameters.properties,
                    required: tool.parameters.required
                }
            }
        };
    }

    /**
     * Convert OpenAI tool call result to universal format
     */
    adaptResult(toolCallResult: unknown): HiveToolResult {
        // OpenAI returns tool results as strings (JSON)
        if (typeof toolCallResult === 'string') {
            try {
                const parsed = JSON.parse(toolCallResult);
                return {
                    success: true,
                    data: parsed
                };
            } catch (error) {
                return {
                    success: false,
                    error: {
                        code: 'PARSE_ERROR',
                        message: `Failed to parse tool result: ${(error as Error).message}`
                    }
                };
            }
        }

        // Already an object
        if (typeof toolCallResult === 'object' && toolCallResult !== null) {
            return {
                success: true,
                data: toolCallResult
            };
        }

        // Unknown format
        return {
            success: false,
            error: {
                code: 'INVALID_RESULT',
                message: 'Tool result must be string or object'
            }
        };
    }

    /**
     * Execute tool call with HiveTool handler
     *
     * Helper method to execute OpenAI tool calls using original HiveTool handlers
     */
    async executeToolCall(toolCall: OpenAIToolCall, tool: HiveTool): Promise<string> {
        try {
            // Parse arguments
            let args: unknown;
            try {
                args = JSON.parse(toolCall.function.arguments);
            } catch (error) {
                return JSON.stringify({
                    success: false,
                    error: {
                        code: 'INVALID_ARGUMENTS',
                        message: `Failed to parse arguments: ${(error as Error).message}`
                    }
                });
            }

            // Execute handler
            const result = await tool.handler(args);

            // Return as JSON string
            return JSON.stringify(result);
        } catch (error) {
            return JSON.stringify({
                success: false,
                error: {
                    code: 'EXECUTION_ERROR',
                    message: (error as Error).message
                }
            });
        }
    }
}
