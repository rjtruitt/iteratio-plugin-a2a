/**
 * Type Definitions for iteratio-plugin-a2a
 *
 * Pure interfaces and types -- no runtime code. Consumers import these
 * to type-check their agent coordination logic without pulling in
 * implementation dependencies.
 */

// Agent types
export type {
  AgentRole,
  AgentState,
  AgentIdentity,
  AgentStatus,
  SpawnRequest,
  AgentTemplate,
  SpawnOptions,
} from './agent.js';

// Message types
export type {
  BaseMessage,
  DeclarativeMessage,
  LLMMessage,
  Message,
  CoordinationRequest,
  CoordinationResponse,
} from './messages.js';

export type { DeclarativeMessages, TriggerMessages } from './messages.js';

// Channel types
export type {
  Channel,
  ChannelMember,
  ChannelTopic,
  ChannelMessage,
  AgentSubscriptionMode,
} from './channels.js';

// Memory types
export type {
  CoordinationPattern,
  MemorySearchOptions,
} from './memory.js';

// Interface types
export type {
  ITransport,
  IDeclarativeHandler,
  ICoordinationMemory,
  IToolAdapter,
  HiveTool,
  HiveToolResult,
  ToolMetadata,
  TransportType,
} from './interfaces.js';

// Storage types
export type {
  IConversationStorage,
  StrandMetadata,
  MergeStrategy,
  MergeOptions,
  StrandData,
  MergeSummary,
} from './storage.js';

// Registry types
export type {
  IToolRegistry,
  ITemplateRegistry,
  IHandlerRegistry,
  IChannelRegistry,
  IHiveRegistry,
} from './registry.js';

// Coordination types
export type {
  ICoordinator,
  IMultiWorkerCoordinator,
  WorkerResult,
  MergeWorkerOptions,
  WorkerSummary,
  IStrandBrancher,
  BranchInfo,
  ICoordinationEvents,
  CoordinationEvent,
} from './coordination.js';

// Work coordination types
export type {
  WorkAnnouncement,
  WorkResource,
  WorkDiscoveryQuery,
  WorkDiscoveryResult,
  CrossChannelSubscription,
  CrossChannelNotification,
  IWorkRegistry,
  ISemanticWorkMatcher,
  ResourceConflict,
  WorkCoordinationStrategy,
} from './work-coordination.js';

// Agent status types
export type {
  AgentStickyStatus,
  IStatusBoard,
  StatusUpdateTrigger,
  StatusBoardSummary,
} from './agent-status.js';

// Sticky types
export type {
  Sticky,
  StickyType,
  StickyCondition,
  StickyCheckContext,
  IStickyRegistry,
  StickyInjection,
  IStickyBuilder,
  StickyTemplate,
} from './stickies.js';

export { CommonStickyTemplates } from './stickies.js';

// Standard template types
export type {
  StandardTemplateId,
  StandardTemplates,
  ITemplateBuilder,
} from './standard-templates.js';

export {
  DEFAULT_SUBAGENT_CONFIG,
  ONE_SHOT_WORKER_CONFIG,
  ORCHESTRATOR_CONFIG,
} from './standard-templates.js';

// Tool format types
export type {
  ToolFormatLevel,
  ToolDefinition,
  ToolFormatStrategies,
} from './tool-formats.js';

export {
  ToolFormats,
  applyToolFormat,
  applyToolFormats,
  estimateTokenSavings,
} from './tool-formats.js';
