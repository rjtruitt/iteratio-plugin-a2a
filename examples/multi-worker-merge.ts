/**
 * Example: Multi-worker merge with compression
 *
 * This shows the PATTERN for implementing multi-worker coordination
 * with strand merging and token compression.
 */

import type {
  IMultiWorkerCoordinator,
  IConversationStorage,
  WorkerResult,
  MergeWorkerOptions,
  WorkerSummary,
  SpawnOptions,
  Message,
} from '../src/index.js';

/**
 * Example implementation of multi-worker coordinator
 * User would implement this in their own code or use @yourorg/agent-loop
 */
class ExampleMultiWorkerCoordinator implements IMultiWorkerCoordinator {
  constructor(
    private conversationStorage: IConversationStorage,
    private llmProvider: any // Your llm-flight-controller provider
  ) {}

  /**
   * Spawn 5 workers in parallel for code review
   */
  async spawnWorkers(requests: SpawnOptions[]): Promise<string[]> {
    console.log(`Spawning ${requests.length} workers...`);

    const workerIds: string[] = [];

    for (const request of requests) {
      const workerId = crypto.randomUUID();

      // Create strand for this worker
      const strandId = `#worker-${workerId}`;

      // Initialize conversation
      await this.conversationStorage.save(strandId, [
        {
          id: crypto.randomUUID(),
          from: 'system',
          timestamp: Date.now(),
          type: 'llm.content',
          to: workerId,
          content: request.systemPrompt || `You are ${request.name}. ${request.purpose}`,
        } as Message,
      ]);

      workerIds.push(workerId);

      console.log(`  ✓ Spawned: ${request.name} (${workerId})`);
    }

    return workerIds;
  }

  /**
   * Wait for all workers to finish
   */
  async waitForCompletion(
    workerIds: string[],
    timeoutMs: number = 300000
  ): Promise<WorkerResult[]> {
    console.log(`Waiting for ${workerIds.length} workers to complete...`);

    // In real implementation, this would poll worker status
    // For example, return mock results:
    const results: WorkerResult[] = workerIds.map((workerId, i) => ({
      workerId,
      strandId: `#worker-${workerId}`,
      status: 'completed' as const,
      result: { findings: ['Issue 1', 'Issue 2'] },
      stats: {
        messageCount: 45 + i * 5,
        tokensUsed: 9000 + i * 1000,
        durationMs: 45000,
        costUsd: 0.27 + i * 0.03,
      },
    }));

    console.log(`  ✓ All workers completed`);
    return results;
  }

  /**
   * Merge worker results with compression (THE KEY FEATURE!)
   */
  async mergeWorkerResults(
    orchestratorStrandId: string,
    workerResults: WorkerResult[],
    options: MergeWorkerOptions
  ): Promise<string> {
    console.log(`\nMerging ${workerResults.length} worker results...`);

    const summaries: string[] = [];
    let totalTokensBefore = 0;
    let totalTokensAfter = 0;

    // 1. Summarize each worker strand
    for (const worker of workerResults) {
      console.log(`  Summarizing ${worker.strandId}...`);

      const workerHistory = await this.conversationStorage.load(worker.strandId);
      totalTokensBefore += worker.stats.tokensUsed;

      // Use CHEAP model (Haiku) for summarization
      const summary = await this.summarizeWorker(
        worker.workerId,
        workerHistory,
        options.maxTokensPerWorker,
        options.model || 'claude-haiku'
      );

      totalTokensAfter += options.maxTokensPerWorker;
      summaries.push(summary);

      console.log(`    ✓ Compressed: ${worker.stats.tokensUsed} → ${options.maxTokensPerWorker} tokens`);
    }

    // 2. Create synthesis
    const synthesis = summaries.join('\n\n---\n\n');

    // 3. Append to orchestrator strand
    const orchestratorHistory = await this.conversationStorage.load(orchestratorStrandId);

    orchestratorHistory.push({
      id: crypto.randomUUID(),
      from: 'system',
      timestamp: Date.now(),
      type: 'llm.content',
      to: 'orchestrator',
      content: `All workers completed. Compressed results:\n\n${synthesis}`,
    } as Message);

    await this.conversationStorage.save(orchestratorStrandId, orchestratorHistory);

    // 4. Log savings
    const tokensSaved = totalTokensBefore - totalTokensAfter;
    const compressionRatio = (tokensSaved / totalTokensBefore) * 100;

    console.log(`\n✅ Merge complete!`);
    console.log(`   Tokens before: ${totalTokensBefore}`);
    console.log(`   Tokens after: ${totalTokensAfter}`);
    console.log(`   Tokens saved: ${tokensSaved} (${compressionRatio.toFixed(1)}% compression)`);

    return synthesis;
  }

  /**
   * Summarize single worker conversation
   */
  private async summarizeWorker(
    workerId: string,
    messages: Message[],
    maxTokens: number,
    model: string
  ): Promise<string> {
    // Build conversation text
    const conversationText = messages
      .filter((m) => m.type === 'llm.content')
      .map((m) => `${m.from}: ${m.content}`)
      .join('\n');

    // Call LLM to summarize (using cheap model!)
    const response = await this.llmProvider.sendMessage({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Summarize this worker's findings in ${maxTokens} tokens or less:

${conversationText}

Focus on:
- Key findings
- Issues discovered
- Recommendations

Summary (max ${maxTokens} tokens):`,
            },
          ],
        },
      ],
    });

    return `## ${workerId} Results\n${response.content[0].text}`;
  }

  /**
   * Get summary of all workers
   */
  async getWorkerSummary(workerIds: string[]): Promise<WorkerSummary> {
    // In real implementation, this would aggregate actual worker stats
    return {
      totalWorkers: workerIds.length,
      completed: workerIds.length,
      failed: 0,
      running: 0,
      cancelled: 0,
      totalTokensUsed: workerIds.length * 9000,
      totalCostUsd: workerIds.length * 0.27,
      totalDurationMs: 45000,
      avgTokensPerWorker: 9000,
      avgCostPerWorker: 0.27,
    };
  }

  /**
   * Cancel all workers
   */
  async cancelAll(workerIds: string[], reason?: string): Promise<void> {
    console.log(`Cancelling ${workerIds.length} workers: ${reason || 'No reason'}`);
    // Implementation would actually cancel workers
  }
}

// ===== USAGE EXAMPLE =====

async function exampleCodeReview() {
  console.log('=== Multi-Worker Code Review Example ===\n');

  // Mock storage and LLM provider
  const storage: IConversationStorage = {
    save: async () => {},
    load: async () => [],
    delete: async () => {},
    list: async () => [],
    getMetadata: async () => null,
    branch: async () => {},
    merge: async () => {},
    mergeMultiple: async () => ({
      targetStrandId: '',
      mergedStrandIds: [],
      strategy: 'summarize',
      messagesBeforeMerge: 0,
      messagesAfterMerge: 0,
      mergedAt: Date.now(),
    }),
  };

  const llmProvider = {
    sendMessage: async () => ({
      content: [{ text: 'Summary of findings...' }],
    }),
  };

  const coordinator = new ExampleMultiWorkerCoordinator(storage, llmProvider);

  // 1. Spawn 5 workers
  const workerRequests: SpawnOptions[] = [
    {
      request: {
        name: 'Security Scanner',
        purpose: 'Find security vulnerabilities',
        model: 'claude-opus',
        tools: ['read_file', 'grep'],
        systemPrompt: 'You are a security expert. Find vulnerabilities.',
      },
    },
    {
      request: {
        name: 'Performance Analyzer',
        purpose: 'Find performance issues',
        model: 'claude-sonnet',
        tools: ['read_file', 'bash'],
        systemPrompt: 'You are a performance expert. Find bottlenecks.',
      },
    },
    {
      request: {
        name: 'Code Quality',
        purpose: 'Check code quality',
        model: 'claude-haiku',
        tools: ['read_file', 'grep'],
        systemPrompt: 'You are a code quality expert. Find issues.',
      },
    },
    {
      request: {
        name: 'Documentation',
        purpose: 'Check documentation',
        model: 'claude-haiku',
        tools: ['read_file', 'grep'],
        systemPrompt: 'You are a documentation expert. Find gaps.',
      },
    },
    {
      request: {
        name: 'Test Coverage',
        purpose: 'Analyze test coverage',
        model: 'claude-haiku',
        tools: ['read_file', 'bash'],
        systemPrompt: 'You are a testing expert. Analyze coverage.',
      },
    },
  ];

  const workerIds = await coordinator.spawnWorkers(workerRequests);

  // 2. Wait for completion
  const results = await coordinator.waitForCompletion(workerIds);

  // 3. Merge with compression (THE MAGIC!)
  const synthesis = await coordinator.mergeWorkerResults('#orchestrator-main', results, {
    strategy: 'summarize-and-compress',
    maxTokensPerWorker: 500, // Compress 9k → 500 tokens per worker!
    model: 'claude-haiku', // Use cheap model for summaries
  });

  console.log('\n📊 Final Synthesis:\n');
  console.log(synthesis);

  // 4. Get summary
  const summary = await coordinator.getWorkerSummary(workerIds);
  console.log('\n📈 Worker Summary:');
  console.log(`   Total workers: ${summary.totalWorkers}`);
  console.log(`   Completed: ${summary.completed}`);
  console.log(`   Total cost: $${summary.totalCostUsd.toFixed(2)}`);
  console.log(`   Avg cost per worker: $${summary.avgCostPerWorker.toFixed(2)}`);
}

// Run example
exampleCodeReview().catch(console.error);
