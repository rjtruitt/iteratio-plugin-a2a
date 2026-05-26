/**
 * Simplified static adapter for tests. Converts tool definitions to
 * OpenAI's function-calling format without the metrics/validation
 * overhead of the full BaseToolAdapter subclass.
 */

export interface OpenAIToolFormat {
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

/** Adapts iteratio tool definitions to OpenAI tool format for GPT API calls. */
export class OpenAIToolAdapter {
  static toSDKFormat(tool: { name: string; description: string; parameters: any }): OpenAIToolFormat {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters.properties,
          required: tool.parameters.required,
        },
      },
    };
  }

  static async executeToolCall(toolCall: { id: string; function: { name: string; arguments: string } }): Promise<{ tool_call_id: string; name: string; result: unknown }> {
    JSON.parse(toolCall.function.arguments); // validate args are parseable
    return {
      tool_call_id: toolCall.id,
      name: toolCall.function.name,
      result: { success: true },
    };
  }
}
