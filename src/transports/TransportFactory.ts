/**
 * Simplified factory for tests. Provides the same create-by-type API
 * as core/transport/TransportFactory without environment detection.
 */

import { InMemoryTransport } from './InMemoryTransport';
import { BroadcastChannelTransport } from './BroadcastChannelTransport';
import { BaseTransport } from './BaseTransport';

export interface TransportFactoryConfig {
  type: 'in-memory' | 'broadcast-channel' | string;
}

/** Factory for creating A2A transport instances by type. */
export class TransportFactory {
  static create(config: TransportFactoryConfig): BaseTransport {
    switch (config.type) {
      case 'in-memory':
        return new InMemoryTransport();
      case 'broadcast-channel':
        return new BroadcastChannelTransport();
      default:
        throw new Error(`Unknown transport type: ${config.type}`);
    }
  }
}
