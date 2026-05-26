/**
 * Optional built-in tools for iteratio-plugin-a2a
 *
 * Users can import these tools if they want standard A2A coordination capabilities.
 * These are NOT registered by default - users must explicitly register them.
 *
 * @example
 * ```typescript
 * import { A2APlugin } from 'iteratio-plugin-a2a';
 * import {
 *   spawnWorkerTool,
 *   broadcastToWorkersTool,
 *   sendMessageTool,
 *   queryWorkerStatusTool,
 *   aggregateResultsTool
 * } from 'iteratio-plugin-a2a/tools';
 *
 * const a2a = new A2APlugin();
 * await a2a.initialize(container);
 *
 * // Register only the tools you need
 * a2a.registerTool(spawnWorkerTool);
 * a2a.registerTool(broadcastToWorkersTool);
 * ```
 */

// Dispatch-style tools (worker management)
export {
  spawnWorkerTool,
  broadcastToWorkersTool,
  sendMessageTool,
  queryWorkerStatusTool,
  aggregateResultsTool
} from './dispatchTools.js';

// Hive-style tools (channel management) + collections
export {
  createChannelTool,
  joinChannelTool,
  dispatchTools,
  hiveTools,
  allTools
} from './hiveTools.js';

// Tool factory for infrastructure-bound tools
export { createToolFactory } from './toolFactory.js';
