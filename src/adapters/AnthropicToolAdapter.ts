/**
 * Simplified static adapter for tests. Converts tool definitions to
 * Anthropic's input_schema format without the metrics/validation overhead
 * of the full BaseToolAdapter subclass.
 */

export interface AnthropicToolFormat {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** Adapts iteratio tool definitions to Anthropic tool format for Claude API calls. */
export class AnthropicToolAdapter {
  static toSDKFormat(tool: { name: string; description: string; parameters: any }): AnthropicToolFormat {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    };
  }

  static async executeToolUse(toolUse: { id: string; name: string; input: Record<string, unknown> }): Promise<{ tool_use_id: string; name: string; result: unknown }> {
    return {
      tool_use_id: toolUse.id,
      name: toolUse.name,
      result: { success: true },
    };
  }
}
