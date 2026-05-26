import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicToolAdapter } from '../adapters/AnthropicToolAdapter';
import { OpenAIToolAdapter } from '../adapters/OpenAIToolAdapter';

describe('AnthropicToolAdapter', () => {
  describe('toSDKFormat(tool)', () => {
    it('should convert a tool to Anthropic SDK format', () => {
      const tool = {
        name: 'read_file',
        description: 'Reads a file from disk',
        parameters: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
        },
      };
      const result = AnthropicToolAdapter.toSDKFormat(tool);
      // Should return the tool in Anthropic's expected format
      expect(result.name).toBe('read_file');
      expect(result.description).toBe('Reads a file from disk');
      expect(result.input_schema.type).toBe('object');
      expect(result.input_schema.properties.path).toEqual({ type: 'string' });
      expect(result.input_schema.required).toEqual(['path']);
    });
  });

  describe('executeToolUse(toolUse)', () => {
    it('should execute a tool use block from Anthropic response', async () => {
      const toolUse = {
        id: 'toolu_123',
        name: 'read_file',
        input: { path: '/tmp/test.txt' },
      };
      const result = await AnthropicToolAdapter.executeToolUse(toolUse);
      // Should execute the tool and return result
      expect(result).toBeDefined();
      expect(result.tool_use_id).toBe('toolu_123');
      expect(result.name).toBe('read_file');
    });
  });
});

describe('OpenAIToolAdapter', () => {
  describe('toSDKFormat(tool)', () => {
    it('should convert a tool to OpenAI SDK format', () => {
      const tool = {
        name: 'read_file',
        description: 'Reads a file from disk',
        parameters: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
        },
      };
      const result = OpenAIToolAdapter.toSDKFormat(tool);
      // Should return the tool in OpenAI's function calling format
      expect(result.type).toBe('function');
      expect(result.function.name).toBe('read_file');
      expect(result.function.description).toBe('Reads a file from disk');
      expect(result.function.parameters.properties.path).toEqual({ type: 'string' });
    });
  });

  describe('executeToolCall(toolCall)', () => {
    it('should execute a tool call from OpenAI response', async () => {
      const toolCall = {
        id: 'call_abc123',
        function: {
          name: 'read_file',
          arguments: JSON.stringify({ path: '/tmp/test.txt' }),
        },
      };
      const result = await OpenAIToolAdapter.executeToolCall(toolCall);
      // Should execute the tool and return result
      expect(result).toBeDefined();
      expect(result.tool_call_id).toBe('call_abc123');
      expect(result.name).toBe('read_file');
    });
  });
});
