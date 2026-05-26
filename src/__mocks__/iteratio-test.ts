/**
 * Mock implementations for iteratio test utilities
 * Provides MockTransport and MockEventBus for testing
 */
import { vi } from 'vitest';

export class MockTransport {
  public sentMessages: Array<{ from: string; to: string; message: any }> = [];
  public publishedMessages: Array<{ channel: string; message: any }> = [];

  send = vi.fn(async (from: string, to: string, message: any): Promise<void> => {
    this.sentMessages.push({ from, to, message });
  });

  publish = vi.fn(async (channel: string, message: any): Promise<void> => {
    this.publishedMessages.push({ channel, message });
  });

  subscribe = vi.fn(async (agentId: string, handler: (message: any) => void | Promise<void>): Promise<void> => {
    // no-op for mock
  });

  unsubscribe = vi.fn(async (agentId: string): Promise<void> => {
    // no-op for mock
  });

  disconnect = vi.fn(async (agentId: string): Promise<void> => {
    // no-op for mock
  });

  getConnected = vi.fn(async (): Promise<string[]> => {
    return [];
  });

  simulateIncoming(msg: any): void {
    // Store for retrieval - this is a test helper
    if (!this._incoming) this._incoming = [];
    this._incoming.push(msg);
  }

  private _incoming: any[] = [];
}

export class MockEventBus {
  private handlers: Map<string, Set<(data: any) => void>> = new Map();

  on(event: string, handler: (data: any) => void): this {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return this;
  }

  off(event: string, handler: (data: any) => void): this {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) this.handlers.delete(event);
    }
    return this;
  }

  emit(event: any): void {
    const type = typeof event === 'string' ? event : event.type;
    const set = this.handlers.get(type);
    if (set) {
      for (const handler of set) {
        handler(event);
      }
    }
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
    return this;
  }
}
