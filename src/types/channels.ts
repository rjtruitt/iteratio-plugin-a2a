/**
 * IRC-style named channel where agents join to coordinate on a shared task.
 * Channels provide scoped communication so agents only receive relevant messages.
 */
export interface Channel {
  name: string;
  topic?: ChannelTopic;
  members: Map<string, ChannelMember>;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

/**
 * Metadata for an agent's membership in a channel.
 * Tracks join time and activity for idle-detection.
 */
export interface ChannelMember {
  userId?: string;
  role?: 'orchestrator' | 'moderator' | 'user';
  joinedAt: number;
  lastActive: number;
}

/**
 * Compressed summary of channel activity. Injected into agent context
 * so new joiners understand current state without replaying full history.
 */
export interface ChannelTopic {
  channel: string;
  summary: string;
  lastUpdated: number;
  keyDecisions: string[];
  activeWorkers: string[];
  completedTasks: number;
  currentFocus?: string;
}

/**
 * A single message posted to a channel. Supports both content messages
 * and lifecycle events (join/part/kick/topic change).
 */
export interface ChannelMessage {
  id: string;
  channel: string;
  from: string;
  content: string;
  timestamp: number;
  type: 'message' | 'join' | 'part' | 'kick' | 'topic';
  mentions?: string[];
}

/**
 * Controls how an agent receives channel messages. Enables token-budget
 * management by switching between real-time delivery, periodic digests,
 * or highlights-only mode.
 */
export interface AgentSubscriptionMode {
  realtime: boolean;
  digest: {
    enabled: boolean;
    interval: number;
    maxTokens: number;
    model?: string;
  };
  highlightsOnly: boolean;
  alwaysDeliver: ('mention' | 'question' | 'urgent' | 'channelBroadcast')[];
}
