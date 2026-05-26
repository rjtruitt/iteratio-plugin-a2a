/**
 * Tool Format Comparison Example
 *
 * Demonstrates different tool format compression levels and their token savings.
 */

import { ToolDefinition, ToolFormats, estimateTokenSavings } from '../src/types/tool-formats.js';

// Example tool definition (verbose version)
const exampleTool: ToolDefinition = {
    name: 'spawn_worker',
    description: `Spawn one or more worker agents to handle specific sub-tasks.

SUPPORTS BULK SPAWNING:
• Spawn single worker: Pass name, purpose, initial_work as strings
• Spawn multiple workers: Pass arrays for workers array
  - Spawns all workers in parallel (rate-limited automatically)
  - All workers start immediately after spawning

IMPORTANT RULES:
1. PLAN FIRST: Before spawning workers, analyze the request and create a plan
2. ONE WORKER PER TASK: Each worker should have unique purpose
3. UNIQUE NAMES: Each worker must have different name
4. PREVENT DUPLICATES: If multiple workers need same data, spawn ONE worker

EXAMPLES:
✓ spawn_worker({ name: "FileScanner", purpose: "Scan directory", initial_work: "List all PDFs" })
✓ spawn_worker({ workers: [{ name: "Scanner", ... }, { name: "Analyzer", ... }] })

MODEL SELECTION:
- Cheap models: File operations, bash commands, data collection
- Expensive models: Complex analysis, code generation, strategic planning`,
    parameters: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'Short descriptive name for the worker (e.g., "FileAnalyzer", "CodeReviewer")'
            },
            purpose: {
                type: 'string',
                description: 'What this worker is responsible for accomplishing'
            },
            initial_work: {
                type: 'string',
                description: 'The specific task or instructions for this worker to execute'
            },
            workers: {
                type: 'array',
                description: 'Array of worker specifications for bulk spawning operations',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        purpose: { type: 'string' },
                        initial_work: { type: 'string' }
                    }
                }
            }
        },
        required: []
    }
};

console.log('=== Tool Format Comparison ===\n');

// Proto format (ultra-compressed)
const protoTool = ToolFormats.proto(exampleTool);
console.log('📦 PROTO FORMAT (90% reduction):');
console.log('Best for: Claude Opus, GPT-4, expensive models');
console.log(`Description: "${protoTool.description}"`);
console.log(`Savings: ${estimateTokenSavings(exampleTool, protoTool)}%\n`);

// Compact format
const compactTool = ToolFormats.compact(exampleTool);
console.log('📋 COMPACT FORMAT (70% reduction):');
console.log('Best for: Claude Sonnet, GPT-3.5, mid-tier models');
console.log(`Description: "${compactTool.description}"`);
console.log(`Savings: ${estimateTokenSavings(exampleTool, compactTool)}%\n`);

// Standard format
const standardTool = ToolFormats.standard(exampleTool);
console.log('📄 STANDARD FORMAT (50% reduction):');
console.log('Best for: Most production use cases, balanced');
console.log(`Description: "${standardTool.description}"`);
console.log(`Savings: ${estimateTokenSavings(exampleTool, standardTool)}%\n`);

// Verbose format (original)
const verboseTool = ToolFormats.verbose(exampleTool);
console.log('📚 VERBOSE FORMAT (0% reduction):');
console.log('Best for: Local models, fine-tuned models, debugging');
console.log(`Description length: ${verboseTool.description.length} chars`);
console.log(`Savings: 0%\n`);

// Cost analysis
console.log('=== Cost Impact (Claude Sonnet 4 @ $3/M input tokens) ===');
const toolsPerRequest = 10; // Typical orchestrator
const requestsPerDay = 100;

const verboseChars = JSON.stringify(verboseTool).length;
const protoChars = JSON.stringify(protoTool).length;
const tokensPerChar = 0.25; // Rough estimate

const verboseTokens = verboseChars * tokensPerChar * toolsPerRequest;
const protoTokens = protoChars * tokensPerChar * toolsPerRequest;

const dailyVerboseCost = (verboseTokens * requestsPerDay / 1_000_000) * 3;
const dailyProtoCost = (protoTokens * requestsPerDay / 1_000_000) * 3;

console.log(`Verbose: ${Math.round(verboseTokens)} tokens/request = $${dailyVerboseCost.toFixed(2)}/day`);
console.log(`Proto: ${Math.round(protoTokens)} tokens/request = $${dailyProtoCost.toFixed(2)}/day`);
console.log(`💰 Daily savings: $${(dailyVerboseCost - dailyProtoCost).toFixed(2)}`);
console.log(`💰 Monthly savings: $${((dailyVerboseCost - dailyProtoCost) * 30).toFixed(2)}`);
