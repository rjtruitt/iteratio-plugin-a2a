/**
 * Simplified in-memory transport for tests. Adds channel join/leave
 * on top of BaseTransport without the full validation/metrics stack.
 */

import { BaseTransport } from './BaseTransport';

/** In-memory transport for A2A communication, suitable for single-process agent networks. */
export class InMemoryTransport extends BaseTransport {
  private channels: Set<string> = new Set();

  joinChannel(channel: string): void {
    this.channels.add(channel);
  }

  leaveChannel(channel: string): void {
    this.channels.delete(channel);
  }

  getChannels(): string[] {
    return Array.from(this.channels);
  }
}
