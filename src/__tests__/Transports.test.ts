import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseTransport } from '../transports/BaseTransport';
import { InMemoryTransport } from '../transports/InMemoryTransport';
import { BroadcastChannelTransport } from '../transports/BroadcastChannelTransport';
import { TransportFactory } from '../transports/TransportFactory';

describe('BaseTransport', () => {
  let transport: BaseTransport;

  beforeEach(() => {
    transport = new (BaseTransport as any)();
  });

  describe('send', () => {
    it('should send a message to a target', async () => {
      const handler = vi.fn();
      (transport as any).subscribe('target-agent', handler);
      await (transport as any).send('target-agent', { type: 'ping' });
      // Message should be delivered to the target
      expect(handler).toHaveBeenCalledWith({ type: 'ping' });
    });
  });

  describe('publish', () => {
    it('should publish a message to a channel', async () => {
      const handler = vi.fn();
      (transport as any).subscribe('channel-1', handler);
      await (transport as any).publish('channel-1', { type: 'broadcast', data: 'hello' });
      // Message should be published to all channel subscribers
      expect(handler).toHaveBeenCalledWith({ type: 'broadcast', data: 'hello' });
    });
  });

  describe('subscribe', () => {
    it('should subscribe to a channel', () => {
      const handler = vi.fn();
      (transport as any).subscribe('channel-1', handler);
      // Handler should be registered for the channel
      expect((transport as any).handlers.get('channel-1')).toContain(handler);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from a channel', () => {
      const handler = vi.fn();
      (transport as any).subscribe('channel-1', handler);
      (transport as any).unsubscribe('channel-1', handler);
      // Handler should no longer receive messages
      expect((transport as any).handlers.has('channel-1')).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect the transport', async () => {
      await (transport as any).disconnect();
      // Transport should be in disconnected state
      expect((transport as any).getConnected()).toBe(false);
    });
  });

  describe('getConnected', () => {
    it('should return connection status', () => {
      const connected = (transport as any).getConnected();
      // Should return a boolean indicating connection state
      expect(connected).toBe(true);
    });
  });

  describe('getMetrics', () => {
    it('should return transport metrics', () => {
      const metrics = (transport as any).getMetrics();
      // Should return metrics (messages sent, received, errors)
      expect(metrics).toBeDefined();
      expect(metrics.sent).toBe(0);
    });
  });

  describe('resetMetrics', () => {
    it('should reset transport metrics', () => {
      (transport as any).resetMetrics();
      const metrics = (transport as any).getMetrics();
      // All counters should be zero
      expect(metrics.sent).toBe(0);
      expect(metrics.received).toBe(0);
      expect(metrics.errors).toBe(0);
    });
  });
});

describe('InMemoryTransport', () => {
  let transport: InMemoryTransport;

  beforeEach(() => {
    transport = new InMemoryTransport();
  });

  describe('joinChannel', () => {
    it('should join a channel', () => {
      (transport as any).joinChannel('room-1');
      // Transport should be subscribed to the channel
      expect((transport as any).getChannels()).toContain('room-1');
    });
  });

  describe('leaveChannel', () => {
    it('should leave a channel', () => {
      (transport as any).joinChannel('room-1');
      (transport as any).leaveChannel('room-1');
      // Transport should no longer receive channel messages
      expect((transport as any).getChannels()).not.toContain('room-1');
    });
  });
});

describe('BroadcastChannelTransport', () => {
  let transport: BroadcastChannelTransport;

  beforeEach(() => {
    transport = new BroadcastChannelTransport();
  });

  describe('joinChannel', () => {
    it('should join a broadcast channel', () => {
      (transport as any).joinChannel('broadcast-room');
      // Should create or join the BroadcastChannel
      expect((transport as any).getChannels()).toContain('broadcast-room');
    });
  });

  describe('leaveChannel', () => {
    it('should leave a broadcast channel', () => {
      (transport as any).joinChannel('broadcast-room');
      (transport as any).leaveChannel('broadcast-room');
      // Should close the BroadcastChannel
      expect((transport as any).getChannels()).not.toContain('broadcast-room');
    });
  });

  describe('close', () => {
    it('should close all channels', () => {
      (transport as any).joinChannel('ch-1');
      (transport as any).joinChannel('ch-2');
      (transport as any).close();
      // All channels should be closed
      expect((transport as any).getChannels()).toHaveLength(0);
    });
  });
});

describe('TransportFactory', () => {
  describe('create(config)', () => {
    it('should return InMemoryTransport for in-memory config', () => {
      const transport = TransportFactory.create({ type: 'in-memory' });
      // Should return an instance of InMemoryTransport
      expect(transport).toBeInstanceOf(InMemoryTransport);
    });

    it('should return BroadcastChannelTransport for broadcast config', () => {
      const transport = TransportFactory.create({ type: 'broadcast-channel' });
      // Should return an instance of BroadcastChannelTransport
      expect(transport).toBeInstanceOf(BroadcastChannelTransport);
    });

    it('should throw for unknown transport type', () => {
      expect(() => TransportFactory.create({ type: 'unknown' } as any)).toThrow();
    });
  });
});
