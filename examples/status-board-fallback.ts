/**
 * Example: Status board for work discovery WITHOUT vector store
 *
 * Agents set compact "sticky" status that stays visible to LLMs
 * without eating context window every message.
 */

import type {
  AgentStickyStatus,
  IStatusBoard,
  StatusBoardSummary,
} from '../src/index.js';

/**
 * Status board implementation (keyword-based, no vector store needed)
 */
class KeywordStatusBoard implements IStatusBoard {
  private statuses = new Map<string, AgentStickyStatus>();

  // ===== SET STATUS (Declarative - Zero Tokens!) =====

  async setStatus(status: AgentStickyStatus): Promise<void> {
    this.statuses.set(status.agentId, status);

    console.log(`\n📌 Status set: ${status.agentId}`);
    console.log(`   "${status.statusLine}"`);
    console.log(`   Keywords: ${status.keywords.join(', ')}`);
  }

  async getStatus(agentId: string): Promise<AgentStickyStatus | null> {
    return this.statuses.get(agentId) || null;
  }

  // ===== GET ACTIVE STATUSES (For LLM Context Injection) =====

  async getActiveStatuses(options?: {
    orchestratorId?: string;
    maxCount?: number;
    sortBy?: 'recent' | 'relevance';
  }): Promise<AgentStickyStatus[]> {
    let statuses = Array.from(this.statuses.values()).filter(
      (s) =>
        s.state === 'active' &&
        (!options?.orchestratorId || s.orchestratorId === options.orchestratorId)
    );

    // Sort by recency
    if (options?.sortBy === 'recent') {
      statuses.sort((a, b) => b.since - a.since);
    }

    // Limit count (token budget!)
    if (options?.maxCount) {
      statuses = statuses.slice(0, options.maxCount);
    }

    return statuses;
  }

  // ===== KEYWORD SEARCH (Fallback without vector store) =====

  async searchByKeyword(keyword: string): Promise<AgentStickyStatus[]> {
    const lowerKeyword = keyword.toLowerCase();

    return Array.from(this.statuses.values()).filter((status) => {
      // Search in status line
      if (status.statusLine.toLowerCase().includes(lowerKeyword)) return true;

      // Search in keywords
      if (status.keywords.some((kw) => kw.toLowerCase().includes(lowerKeyword)))
        return true;

      // Search in primary resource
      if (status.primaryResource?.toLowerCase().includes(lowerKeyword)) return true;

      return false;
    });
  }

  // ===== COMPACT SUMMARY FOR LLM (Token-Efficient!) =====

  async getStatusSummary(options?: {
    maxTokens?: number;
    excludeAgentId?: string;
  }): Promise<string> {
    const active = await this.getActiveStatuses({ maxCount: 10 }); // Max 10 to save tokens

    const lines: string[] = ['=== ACTIVE WORKERS ==='];

    for (const status of active) {
      if (status.agentId === options?.excludeAgentId) continue;

      // Compact format: ~50 tokens per worker
      const keywords = status.keywords.slice(0, 3).join(', '); // Max 3 keywords
      lines.push(
        `${status.agentId}: ${status.statusLine} [${keywords}]`
      );
    }

    lines.push(`=== ${active.length} ACTIVE ===`);

    return lines.join('\n');
  }

  async clearStatus(agentId: string): Promise<void> {
    this.statuses.delete(agentId);
    console.log(`\n🗑️  Status cleared: ${agentId}`);
  }
}

// ===== USAGE SCENARIOS =====

async function scenario1_WorkerSetsStatus() {
  console.log('=== SCENARIO 1: Workers Set Sticky Status ===');

  const board = new KeywordStatusBoard();

  // Worker 1 starts work
  await board.setStatus({
    agentId: 'worker-1',
    orchestratorId: 'orch-A',
    statusLine: 'Analyzing /src/auth for security vulnerabilities',
    workType: 'file-analysis',
    primaryResource: '/src/auth',
    keywords: ['security', 'authentication', 'auth', 'vulnerabilities'],
    since: Date.now(),
    state: 'active',
  });

  // Worker 5 starts work
  await board.setStatus({
    agentId: 'worker-5',
    orchestratorId: 'orch-C',
    statusLine: 'Researching hanta virus symptoms and transmission',
    workType: 'research',
    primaryResource: 'hanta virus',
    keywords: ['hanta', 'virus', 'symptoms', 'transmission', 'medical'],
    since: Date.now(),
    state: 'active',
  });

  // Worker 10 starts work
  await board.setStatus({
    agentId: 'worker-10',
    orchestratorId: 'orch-F',
    statusLine: 'Fixing XSS vulnerability in login form',
    workType: 'bug-fix',
    primaryResource: '/src/auth/login.ts',
    keywords: ['security', 'xss', 'authentication', 'bug-fix'],
    since: Date.now(),
    state: 'active',
  });
}

async function scenario2_OrchestratorChecksBoard() {
  console.log('\n\n=== SCENARIO 2: Orchestrator Checks Status Board ===');

  const board = new KeywordStatusBoard();

  // Setup statuses
  await board.setStatus({
    agentId: 'worker-1',
    orchestratorId: 'orch-A',
    statusLine: 'Analyzing /src/auth',
    workType: 'file-analysis',
    primaryResource: '/src/auth',
    keywords: ['security', 'authentication', 'auth'],
    since: Date.now() - 60000,
    state: 'active',
  });

  await board.setStatus({
    agentId: 'worker-5',
    orchestratorId: 'orch-C',
    statusLine: 'Researching hanta virus',
    workType: 'research',
    primaryResource: 'hanta virus',
    keywords: ['hanta', 'virus', 'medical'],
    since: Date.now() - 30000,
    state: 'active',
  });

  // Orchestrator B wants to work on auth
  console.log('\nOrchestrator B: "Who else is working on authentication?"');

  const authWorkers = await board.searchByKeyword('auth');

  console.log(`\n🔍 Found ${authWorkers.length} workers:`);
  for (const worker of authWorkers) {
    console.log(`   ${worker.agentId}: ${worker.statusLine}`);
  }

  if (authWorkers.length > 0) {
    console.log(`\n💡 Suggestion: Collaborate with ${authWorkers[0].agentId} or wait for results`);
  }
}

async function scenario3_LLMContextInjection() {
  console.log('\n\n=== SCENARIO 3: Inject Status Board into LLM Context ===');

  const board = new KeywordStatusBoard();

  // Multiple workers active
  await board.setStatus({
    agentId: 'worker-1',
    orchestratorId: 'orch-A',
    statusLine: 'Analyzing /src/auth',
    workType: 'file-analysis',
    primaryResource: '/src/auth',
    keywords: ['security', 'authentication'],
    since: Date.now(),
    state: 'active',
  });

  await board.setStatus({
    agentId: 'worker-5',
    orchestratorId: 'orch-C',
    statusLine: 'Researching hanta virus',
    workType: 'research',
    primaryResource: 'hanta virus',
    keywords: ['hanta', 'virus', 'medical'],
    since: Date.now(),
    state: 'active',
  });

  await board.setStatus({
    agentId: 'worker-10',
    orchestratorId: 'orch-F',
    statusLine: 'Fixing XSS in /src/auth/login.ts',
    workType: 'bug-fix',
    primaryResource: '/src/auth/login.ts',
    keywords: ['security', 'xss', 'auth'],
    since: Date.now(),
    state: 'active',
  });

  // Get compact summary for LLM
  console.log('\n📋 Status Board Summary (for LLM context):');
  const summary = await board.getStatusSummary({ maxTokens: 200 });
  console.log('\n' + summary);

  console.log('\n💰 Token cost: ~100 tokens (vs 1000+ for full work announcements!)');
  console.log('   This stays in LLM context across messages without re-sending');
}

async function scenario4_KeywordDiscovery() {
  console.log('\n\n=== SCENARIO 4: Keyword Discovery (No Vector Store) ===');

  const board = new KeywordStatusBoard();

  // Setup workers
  await board.setStatus({
    agentId: 'worker-1',
    orchestratorId: 'orch-A',
    statusLine: 'Analyzing authentication module',
    workType: 'file-analysis',
    primaryResource: '/src/auth',
    keywords: ['auth', 'security', 'login', 'authentication'],
    since: Date.now(),
    state: 'active',
  });

  await board.setStatus({
    agentId: 'worker-5',
    orchestratorId: 'orch-C',
    statusLine: 'Researching hantavirus epidemiology',
    workType: 'research',
    primaryResource: 'hantavirus',
    keywords: ['hanta', 'hantavirus', 'virus', 'epidemiology', 'medical'],
    since: Date.now(),
    state: 'active',
  });

  await board.setStatus({
    agentId: 'worker-10',
    orchestratorId: 'orch-F',
    statusLine: 'Testing login endpoint',
    workType: 'testing',
    primaryResource: '/api/login',
    keywords: ['login', 'auth', 'testing', 'api'],
    since: Date.now(),
    state: 'active',
  });

  // Different keyword searches
  console.log('\n🔍 Search: "auth"');
  const authResults = await board.searchByKeyword('auth');
  console.log(`   Found ${authResults.length} workers:`);
  authResults.forEach((w) => console.log(`   - ${w.agentId}: ${w.statusLine}`));

  console.log('\n🔍 Search: "virus"');
  const virusResults = await board.searchByKeyword('virus');
  console.log(`   Found ${virusResults.length} workers:`);
  virusResults.forEach((w) => console.log(`   - ${w.agentId}: ${w.statusLine}`));

  console.log('\n💡 Even without vector store, keyword matching finds relevant work!');
}

async function scenario5_TokenComparison() {
  console.log('\n\n=== SCENARIO 5: Token Comparison ===');

  console.log('\n❌ WITHOUT Status Board:');
  console.log('   Orchestrator asks: "Who is working on auth?"');
  console.log('   → Must query all workers (send message to each)');
  console.log('   → Each worker responds with full context');
  console.log('   → 10 workers × 200 tokens = 2,000 tokens');

  console.log('\n✅ WITH Status Board:');
  console.log('   Orchestrator checks status board (declarative)');
  console.log('   → Status board summary: ~100 tokens (pre-computed)');
  console.log('   → Keyword search: zero tokens (local matching)');
  console.log('   → Total: 100 tokens');

  console.log('\n💰 Savings: 95% token reduction!');
}

// Run all scenarios
(async () => {
  await scenario1_WorkerSetsStatus();
  await scenario2_OrchestratorChecksBoard();
  await scenario3_LLMContextInjection();
  await scenario4_KeywordDiscovery();
  await scenario5_TokenComparison();
})();
