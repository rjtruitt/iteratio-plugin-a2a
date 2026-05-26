/**
 * Example: Work discovery and cross-orchestrator coordination
 *
 * Scenario: Multiple orchestrators need similar work done.
 * Instead of duplicating effort, they discover existing work and reuse/collaborate.
 */

import type {
  WorkAnnouncement,
  WorkDiscoveryQuery,
  WorkDiscoveryResult,
  IWorkRegistry,
  ISemanticWorkMatcher,
  CrossChannelSubscription,
  WorkResource,
} from '../src/index.js';

/**
 * Example implementation with vector store (optimal)
 */
class VectorWorkRegistry implements IWorkRegistry, ISemanticWorkMatcher {
  private announcements = new Map<string, WorkAnnouncement>();
  private vectorStore?: any; // Optional: @yourorg/vector-store
  private subscriptions = new Map<string, CrossChannelSubscription>();

  constructor(vectorStore?: any) {
    this.vectorStore = vectorStore;
  }

  // ===== ANNOUNCE WORK (Declarative - Zero Tokens!) =====

  async announce(announcement: WorkAnnouncement): Promise<void> {
    console.log(`\n📢 Work announced by ${announcement.workerId}:`);
    console.log(`   Type: ${announcement.workType}`);
    console.log(`   Resources: ${announcement.resources.map((r) => r.identifier).join(', ')}`);
    console.log(`   Channel: ${announcement.channel}`);

    this.announcements.set(announcement.workerId, announcement);

    // Store in vector store for semantic search (if available)
    if (this.vectorStore) {
      await this.vectorStore.store({
        id: announcement.workerId,
        content: `${announcement.workType}: ${announcement.description}`,
        metadata: {
          workType: announcement.workType,
          resources: announcement.resources.map((r) => r.identifier),
          orchestratorId: announcement.orchestratorId,
          channel: announcement.channel,
          status: announcement.status,
          timestamp: announcement.startedAt,
        },
      });
    }

    // Notify subscribers (zero tokens!)
    await this.notifySubscribers(announcement);
  }

  // ===== DISCOVER WORK (Vector Store if available, fallback to keywords) =====

  async discover(query: WorkDiscoveryQuery): Promise<WorkDiscoveryResult[]> {
    console.log(`\n🔍 Discovering work...`);

    const results: WorkDiscoveryResult[] = [];

    // 1. Exact resource match (zero tokens - just Map lookup!)
    if (query.resource) {
      console.log(`   Looking for exact match: ${query.resource.identifier}`);

      for (const announcement of this.announcements.values()) {
        const hasResource = announcement.resources.some(
          (r) =>
            r.type === query.resource!.type && r.identifier === query.resource!.identifier
        );

        if (hasResource) {
          results.push({
            announcement,
            isExactMatch: true,
            recommendation: this.getRecommendation(announcement, query.resource!),
            reason: `Exact match: ${query.resource.identifier}`,
          });
        }
      }
    }

    // 2. Semantic search (uses vector store if available)
    if (query.semanticQuery) {
      if (this.vectorStore) {
        console.log(`   Using vector store for semantic search: "${query.semanticQuery}"`);
        const similar = await this.findSimilar(query.semanticQuery, {
          topK: query.topK || 5,
          excludeOrchestratorId: query.excludeOrchestratorId,
        });

        for (const match of similar) {
          results.push({
            announcement: match.announcement,
            similarity: match.similarity,
            isExactMatch: false,
            recommendation: this.getRecommendationSemantic(match),
            reason: `${(match.similarity * 100).toFixed(0)}% similar: ${match.announcement.description}`,
          });
        }
      } else {
        // Fallback: Keyword matching (works without vector store)
        console.log(`   Falling back to keyword search: "${query.semanticQuery}"`);
        const keywords = query.semanticQuery.toLowerCase().split(' ');

        for (const announcement of this.announcements.values()) {
          const text = `${announcement.workType} ${announcement.description}`.toLowerCase();
          const matchCount = keywords.filter((kw) => text.includes(kw)).length;
          const similarity = matchCount / keywords.length;

          if (similarity > 0.3) {
            // 30% keyword match
            results.push({
              announcement,
              similarity,
              isExactMatch: false,
              recommendation: 'collaborate',
              reason: `${(similarity * 100).toFixed(0)}% keyword match`,
            });
          }
        }
      }
    }

    console.log(`   Found ${results.length} potential matches`);
    return results;
  }

  // ===== SEMANTIC MATCHING (Vector Store) =====

  async findSimilar(
    description: string,
    options?: {
      topK?: number;
      minSimilarity?: number;
      excludeOrchestratorId?: string;
    }
  ): Promise<Array<{ announcement: WorkAnnouncement; similarity: number }>> {
    if (!this.vectorStore) {
      return []; // No vector store available
    }

    const results = await this.vectorStore.search(description, {
      topK: options?.topK || 5,
      filters: {
        orchestratorId: options?.excludeOrchestratorId
          ? { $ne: options.excludeOrchestratorId }
          : undefined,
        status: ['claimed', 'in-progress'], // Only active work
      },
    });

    return results.map((r: any) => ({
      announcement: this.announcements.get(r.id)!,
      similarity: r.score,
    }));
  }

  async isDuplicate(
    description: string,
    threshold: number = 0.9
  ): Promise<{
    isDuplicate: boolean;
    existingWork?: WorkAnnouncement;
    similarity?: number;
  }> {
    const similar = await this.findSimilar(description, { topK: 1 });

    if (similar.length > 0 && similar[0].similarity >= threshold) {
      return {
        isDuplicate: true,
        existingWork: similar[0].announcement,
        similarity: similar[0].similarity,
      };
    }

    return { isDuplicate: false };
  }

  async suggestCollaboration(
    workerId: string,
    myWork: WorkAnnouncement
  ): Promise<
    Array<{
      otherWork: WorkAnnouncement;
      reason: string;
      collaborationType: 'merge-efforts' | 'share-results' | 'sequential';
    }>
  > {
    const similar = await this.findSimilar(myWork.description, {
      topK: 3,
      minSimilarity: 0.6,
      excludeOrchestratorId: myWork.orchestratorId,
    });

    return similar.map((match) => ({
      otherWork: match.announcement,
      reason: `${(match.similarity * 100).toFixed(0)}% similar work in ${match.announcement.channel}`,
      collaborationType:
        match.similarity > 0.8 ? 'merge-efforts' : 'share-results',
    }));
  }

  // ===== CROSS-CHANNEL SUBSCRIPTIONS =====

  async subscribe(subscription: CrossChannelSubscription): Promise<string> {
    const id = crypto.randomUUID();
    this.subscriptions.set(id, subscription);

    console.log(`\n✅ Subscription created: ${subscription.subscriberId}`);
    console.log(`   Watching: ${subscription.targetChannels?.join(', ') || 'all channels'}`);
    console.log(`   Delivery: ${subscription.deliveryMode}`);

    return id;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    this.subscriptions.delete(subscriptionId);
  }

  private async notifySubscribers(announcement: WorkAnnouncement): Promise<void> {
    for (const [subId, sub] of this.subscriptions) {
      // Check if subscription matches this announcement
      const matches =
        (!sub.targetChannels || sub.targetChannels.includes(announcement.channel)) &&
        (!sub.workType || sub.workType === announcement.workType);

      if (matches && announcement.status === 'completed') {
        console.log(
          `   → Notifying subscriber ${sub.subscriberId} in ${sub.subscriberChannel}`
        );
        // In real implementation, send CrossChannelNotification
      }
    }
  }

  // ===== HELPERS =====

  async updateStatus(
    workerId: string,
    status: 'in-progress' | 'completed' | 'failed',
    result?: unknown
  ): Promise<void> {
    const announcement = this.announcements.get(workerId);
    if (!announcement) return;

    announcement.status = status;
    if (status === 'completed') {
      announcement.completedAt = Date.now();
    }

    console.log(`\n✓ Work ${status}: ${workerId}`);

    // Notify subscribers
    await this.notifySubscribers(announcement);
  }

  async isResourceAvailable(resource: WorkResource): Promise<{
    available: boolean;
    inUseBy?: string[];
    estimatedFreeAt?: number;
  }> {
    const inUse: string[] = [];

    for (const [workerId, announcement] of this.announcements) {
      if (announcement.status !== 'in-progress') continue;

      const usesResource = announcement.resources.some(
        (r) => r.type === resource.type && r.identifier === resource.identifier
      );

      if (usesResource) {
        inUse.push(workerId);
      }
    }

    return {
      available: inUse.length === 0,
      inUseBy: inUse.length > 0 ? inUse : undefined,
      estimatedFreeAt: inUse.length > 0 ? Date.now() + 60000 : undefined,
    };
  }

  async getActiveWork(orchestratorId?: string): Promise<WorkAnnouncement[]> {
    return Array.from(this.announcements.values()).filter(
      (a) =>
        (a.status === 'claimed' || a.status === 'in-progress') &&
        (!orchestratorId || a.orchestratorId === orchestratorId)
    );
  }

  async cleanup(olderThanMs: number): Promise<number> {
    const cutoff = Date.now() - olderThanMs;
    let count = 0;

    for (const [workerId, announcement] of this.announcements) {
      if (
        (announcement.status === 'completed' || announcement.status === 'failed') &&
        announcement.startedAt < cutoff
      ) {
        this.announcements.delete(workerId);
        count++;
      }
    }

    return count;
  }

  private getRecommendation(
    announcement: WorkAnnouncement,
    resource: WorkResource
  ): 'reuse' | 'wait' | 'collaborate' | 'spawn-new' {
    if (announcement.status === 'completed') return 'reuse';
    if (announcement.status === 'in-progress' && resource.accessMode === 'exclusive')
      return 'wait';
    if (announcement.status === 'in-progress' && resource.accessMode === 'read')
      return 'collaborate';
    return 'spawn-new';
  }

  private getRecommendationSemantic(match: {
    announcement: WorkAnnouncement;
    similarity: number;
  }): 'reuse' | 'wait' | 'collaborate' | 'spawn-new' {
    if (match.similarity > 0.95) return 'reuse'; // Near duplicate
    if (match.similarity > 0.8) return 'collaborate'; // Very similar
    if (match.similarity > 0.6) return 'wait'; // Similar, might share results
    return 'spawn-new';
  }
}

// ===== USAGE SCENARIOS =====

async function scenario1_PreventDuplicateWork() {
  console.log('=== SCENARIO 1: Prevent Duplicate Work ===');

  const registry = new VectorWorkRegistry();

  // Orchestrator A spawns worker for auth analysis
  await registry.announce({
    workerId: 'worker-1',
    orchestratorId: 'orch-A',
    channel: '#orch-a-main',
    workType: 'file-analysis',
    resources: [
      { type: 'directory', identifier: '/src/auth', accessMode: 'read' },
    ],
    description: 'Analyzing authentication module for security vulnerabilities',
    status: 'in-progress',
    startedAt: Date.now(),
    tags: ['security', 'authentication', 'code-review'],
  });

  // Orchestrator B wants to do similar work
  console.log('\nOrchestrator B: "I need someone to analyze /src/auth"');

  const results = await registry.discover({
    resource: { type: 'directory', identifier: '/src/auth', accessMode: 'read' },
  });

  if (results.length > 0) {
    const match = results[0];
    console.log(`\n💡 Found existing work!`);
    console.log(`   Worker: ${match.announcement.workerId}`);
    console.log(`   Status: ${match.announcement.status}`);
    console.log(`   Recommendation: ${match.recommendation}`);
    console.log(`   Reason: ${match.reason}`);

    if (match.recommendation === 'reuse' || match.recommendation === 'wait') {
      console.log(`\n✅ Avoiding duplicate work - will ${match.recommendation}`);
    }
  }
}

async function scenario2_SemanticDiscovery() {
  console.log('\n\n=== SCENARIO 2: Semantic Discovery (Vector Store) ===');

  // Mock vector store
  const mockVectorStore = {
    store: async (data: any) => data.id,
    search: async (query: string, options: any) => {
      // Simulate vector similarity
      if (query.includes('hanta')) {
        return [
          {
            id: 'worker-5',
            score: 0.92, // 92% similar!
            metadata: { workType: 'research' },
          },
        ];
      }
      return [];
    },
  };

  const registry = new VectorWorkRegistry(mockVectorStore);

  // Worker 5 researching hanta virus symptoms
  await registry.announce({
    workerId: 'worker-5',
    orchestratorId: 'orch-C',
    channel: '#orch-c-research',
    workType: 'research',
    resources: [{ type: 'topic', identifier: 'hanta virus symptoms', accessMode: 'read' }],
    description: 'Researching hanta virus symptoms and early detection methods',
    status: 'in-progress',
    startedAt: Date.now(),
    tags: ['medical', 'research', 'hanta-virus'],
  });

  // Orchestrator D wants similar research
  console.log('\nOrchestrator D: "Research hanta virus transmission methods"');

  const results = await registry.discover({
    semanticQuery: 'hanta virus transmission',
    topK: 3,
  });

  if (results.length > 0) {
    const match = results[0];
    console.log(`\n💡 Found similar work! (Vector Store)`);
    console.log(`   Worker: ${match.announcement.workerId}`);
    console.log(`   Similarity: ${((match.similarity || 0) * 100).toFixed(0)}%`);
    console.log(`   Description: ${match.announcement.description}`);
    console.log(`   Recommendation: ${match.recommendation}`);

    if (match.recommendation === 'collaborate') {
      console.log(`\n✅ Suggesting collaboration instead of duplicate research`);
    }
  }
}

async function scenario3_CrossChannelSubscription() {
  console.log('\n\n=== SCENARIO 3: Cross-Channel Subscription ===');

  const registry = new VectorWorkRegistry();

  // Orchestrator E subscribes to auth-related completions
  await registry.subscribe({
    subscriberId: 'orch-E',
    subscriberChannel: '#orch-e-main',
    workType: 'file-analysis',
    tags: ['authentication', 'security'],
    deliveryMode: 'on-completion',
  });

  console.log('\nOrchestrator E: "Notify me when anyone finishes auth-related work"');

  // Orchestrator F's worker completes auth work
  await registry.announce({
    workerId: 'worker-10',
    orchestratorId: 'orch-F',
    channel: '#orch-f-workers',
    workType: 'file-analysis',
    resources: [{ type: 'file', identifier: '/src/auth/login.ts', accessMode: 'write' }],
    description: 'Fixed XSS vulnerability in login form',
    status: 'in-progress',
    startedAt: Date.now() - 30000,
    tags: ['authentication', 'security', 'bug-fix'],
  });

  // Complete the work
  await registry.updateStatus('worker-10', 'completed', {
    fixed: 'XSS vulnerability',
    file: '/src/auth/login.ts',
  });

  console.log('\n→ Orchestrator E receives notification (zero tokens!)');
  console.log('   "Worker-10 completed: Fixed XSS in /src/auth/login.ts"');
}

async function scenario4_ResourceConflict() {
  console.log('\n\n=== SCENARIO 4: Resource Conflict Detection ===');

  const registry = new VectorWorkRegistry();

  // Worker claims exclusive access to file
  await registry.announce({
    workerId: 'worker-20',
    orchestratorId: 'orch-G',
    channel: '#orch-g-refactor',
    workType: 'code-review',
    resources: [
      { type: 'file', identifier: '/src/database.ts', accessMode: 'exclusive' },
    ],
    description: 'Refactoring database connection pool',
    status: 'in-progress',
    startedAt: Date.now(),
  });

  // Another orchestrator wants same file
  console.log('\nOrchestrator H: "I need to edit /src/database.ts"');

  const resourceCheck = await registry.isResourceAvailable({
    type: 'file',
    identifier: '/src/database.ts',
    accessMode: 'write',
  });

  if (!resourceCheck.available) {
    console.log(`\n⚠️  Resource conflict detected!`);
    console.log(`   In use by: ${resourceCheck.inUseBy!.join(', ')}`);
    console.log(`   Estimated free at: ${new Date(resourceCheck.estimatedFreeAt!).toLocaleTimeString()}`);
    console.log(`\n✅ Waiting instead of causing conflicts`);
  }
}

// Run all scenarios
(async () => {
  await scenario1_PreventDuplicateWork();
  await scenario2_SemanticDiscovery();
  await scenario3_CrossChannelSubscription();
  await scenario4_ResourceConflict();

  console.log('\n\n📊 Token Savings Summary:');
  console.log('   Without work registry: Each orchestrator spawns duplicate workers');
  console.log('   With work registry: Reuse/collaborate/wait (declarative - zero tokens!)');
  console.log('   Vector store: Semantic discovery of similar work (minimal tokens)');
  console.log('   Cross-channel subscriptions: Get notified automatically (zero tokens!)');
})();
