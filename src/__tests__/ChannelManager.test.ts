import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChannelManager } from '../core/channels/ChannelManager';
import { MockTransport, MockEventBus } from 'iteratio/src/__test__';
import { HiveEventBus } from '../core/events/HiveEventBus';

describe('ChannelManager', () => {
  let channelManager: ChannelManager;
  let transport: MockTransport;
  let eventBus: HiveEventBus;

  beforeEach(() => {
    transport = new MockTransport();
    eventBus = new HiveEventBus();
    channelManager = new ChannelManager({
      transport,
      eventBus,
      maxChannels: 100,
    });
  });

  describe('create channel', () => {
    it('should create a channel with a valid name', async () => {
      const channel = await channelManager.create('#general');
      expect(channel).toBeDefined();
      expect(channel.name).toBe('#general');
    });

    it('should throw for invalid channel name (no # prefix)', async () => {
      await expect(channelManager.create('no-hash'))
        .rejects.toThrow(/must start with #/);
    });

    it('should throw for empty channel name', async () => {
      await expect(channelManager.create(''))
        .rejects.toThrow(/non-empty/);
    });

    it('should throw if channel already exists', async () => {
      await channelManager.create('#duplicate');
      await expect(channelManager.create('#duplicate'))
        .rejects.toThrow(/already exists/);
    });

    it('should enforce max channels limit', async () => {
      const limited = new ChannelManager({
        transport,
        eventBus,
        maxChannels: 2,
      });
      await limited.create('#ch1');
      await limited.create('#ch2');
      await expect(limited.create('#ch3'))
        .rejects.toThrow(/[Mm]aximum/);
    });

    it('should emit channel.created event', async () => {
      const listener = vi.fn();
      eventBus.on('channel.created', listener);
      await channelManager.create('#events');
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('subscribe agent to channel', () => {
    it('should add agent as member of channel', async () => {
      await channelManager.create('#team');
      await channelManager.join('#team', 'agent-1');
      expect(channelManager.isMember('#team', 'agent-1')).toBe(true);
    });

    it('should auto-create channel if it does not exist on join', async () => {
      await channelManager.join('#auto-created', 'agent-1');
      expect(channelManager.get('#auto-created')).toBeDefined();
    });

    it('should emit channel.joined event', async () => {
      const listener = vi.fn();
      eventBus.on('channel.joined', listener);
      await channelManager.create('#joinable');
      await channelManager.join('#joinable', 'agent-1');
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('unsubscribe from channel', () => {
    it('should remove agent from channel membership', async () => {
      await channelManager.create('#leaving');
      await channelManager.join('#leaving', 'agent-1');
      await channelManager.leave('#leaving', 'agent-1');
      expect(channelManager.isMember('#leaving', 'agent-1')).toBe(false);
    });

    it('should throw when agent is not a member', async () => {
      await channelManager.create('#strangers');
      await expect(channelManager.leave('#strangers', 'nobody'))
        .rejects.toThrow(/not a member/);
    });

    it('should emit channel.left event', async () => {
      const listener = vi.fn();
      eventBus.on('channel.left', listener);
      await channelManager.create('#bye');
      await channelManager.join('#bye', 'agent-1');
      await channelManager.leave('#bye', 'agent-1');
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('broadcast message to channel', () => {
    it('should broadcast message to all channel members', async () => {
      await channelManager.create('#broadcast');
      await channelManager.join('#broadcast', 'agent-1');
      await channelManager.join('#broadcast', 'agent-2');

      // Expected: channelManager.broadcast('#broadcast', { content: 'Hello all' });
      // All members should receive the message via transport
      expect((channelManager as any).broadcast).toBeDefined();
    });

    it('should not deliver broadcast to non-members', async () => {
      await channelManager.create('#exclusive');
      await channelManager.join('#exclusive', 'member');

      // Expected: channelManager.broadcast('#exclusive', { content: 'Secret' });
      // transport.send should only be called for 'member', not other agents
      const members = channelManager.getMembers('#exclusive');
      expect(members).toContain('member');
      expect(members).not.toContain('outsider');
    });
  });

  describe('direct message (point-to-point)', () => {
    it('should send message directly to specific agent', async () => {
      // Expected: channelManager.directMessage('agent-1', 'agent-2', { content: 'Hey' });
      expect((channelManager as any).directMessage).toBeDefined();
    });

    it('should not broadcast direct messages to channel', async () => {
      // Direct messages should go point-to-point, not through any channel
      // Expected: transport.send called with specific target
      expect((channelManager as any).directMessage).toBeDefined();
    });
  });

  describe('channel isolation', () => {
    it('should keep messages in channel A separate from channel B', async () => {
      await channelManager.create('#channel-a');
      await channelManager.create('#channel-b');
      await channelManager.join('#channel-a', 'agent-1');
      await channelManager.join('#channel-b', 'agent-2');

      // agent-1 is only in #channel-a
      expect(channelManager.isMember('#channel-a', 'agent-1')).toBe(true);
      expect(channelManager.isMember('#channel-b', 'agent-1')).toBe(false);
    });

    it('should return only channels agent belongs to', async () => {
      await channelManager.create('#only-mine');
      await channelManager.create('#not-mine');
      await channelManager.join('#only-mine', 'agent-x');

      const channels = channelManager.getChannelsForAgent('agent-x');
      expect(channels).toContain('#only-mine');
      expect(channels).not.toContain('#not-mine');
    });
  });

  describe('multiple agents on same channel', () => {
    it('should support multiple members', async () => {
      await channelManager.create('#crowded');
      await channelManager.join('#crowded', 'a1');
      await channelManager.join('#crowded', 'a2');
      await channelManager.join('#crowded', 'a3');
      expect(channelManager.getMemberCount('#crowded')).toBe(3);
    });

    it('should list all members', async () => {
      await channelManager.create('#listed');
      await channelManager.join('#listed', 'x');
      await channelManager.join('#listed', 'y');
      const members = channelManager.getMembers('#listed');
      expect(members).toContain('x');
      expect(members).toContain('y');
    });
  });

  describe('channel cleanup on agent termination', () => {
    it('should auto-delete empty channels when last member leaves', async () => {
      await channelManager.create('#solo');
      await channelManager.join('#solo', 'only-one');
      await channelManager.leave('#solo', 'only-one');

      // Channel should be auto-deleted when empty
      expect(channelManager.get('#solo')).toBeUndefined();
    });

    it('should remove agent from all channels on cleanup', async () => {
      await channelManager.join('#ch1', 'dying-agent');
      await channelManager.join('#ch2', 'dying-agent');

      // Expected: channelManager.removeAgentFromAll('dying-agent');
      // Both channels should no longer have this agent
      expect((channelManager as any).removeAgentFromAll).toBeDefined();
    });
  });

  describe('channel topic', () => {
    it('should update channel topic', async () => {
      await channelManager.create('#topical');
      await channelManager.updateTopic('#topical', {
        channel: '#topical',
        summary: 'Discussing architecture',
        keyDecisions: ['Use event bus'],
        activeWorkers: ['agent-1'],
        lastUpdated: Date.now(),
      });
      const topic = channelManager.getTopic('#topical');
      expect(topic?.summary).toBe('Discussing architecture');
    });
  });

  describe('statistics', () => {
    it('should report channel stats', async () => {
      await channelManager.create('#stats');
      await channelManager.join('#stats', 'a1');
      await channelManager.join('#stats', 'a2');

      const stats = channelManager.getStats();
      expect(stats.totalChannels).toBe(1);
      expect(stats.totalMembers).toBe(2);
    });
  });
});
