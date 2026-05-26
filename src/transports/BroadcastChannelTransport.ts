/**
 * Simplified BroadcastChannel transport for tests. Exercises the same
 * API surface as the full implementation without requiring DOM APIs.
 */

import { BaseTransport } from './BaseTransport';

/** BroadcastChannel-based transport for A2A communication across browser windows/iframes. */
export class BroadcastChannelTransport extends BaseTransport {
  private channels: Set<string> = new Set();

  joinChannel(channel: string): void {
    this.channels.add(channel);
  }

  leaveChannel(channel: string): void {
    this.channels.delete(channel);
  }

  close(): void {
    this.channels.clear();
    this.handlers.clear();
  }

  getChannels(): string[] {
    return Array.from(this.channels);
  }
}
