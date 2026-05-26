/**
 * TransportFactory - Factory for creating transport instances
 *
 * Simplifies transport instantiation with sensible defaults.
 *
 * @example
 * ```typescript
 * const transport = TransportFactory.create('in-memory');
 * const wsTransport = TransportFactory.create('websocket', { url: 'ws://localhost:3000' });
 * ```
 */

import type { ITransport, TransportType } from '../../types/interfaces.js';
import { InMemoryTransport } from './InMemoryTransport.js';
import { TransportConfig } from './BaseTransport.js';

export interface TransportFactoryOptions {
    /** Transport-specific configuration */
    config?: TransportConfig;
    /** Additional transport-specific options */
    [key: string]: unknown;
}

/**
 * Factory for creating transport instances
 */
export class TransportFactory {
    /**
     * Create transport by type
     */
    static create(type: TransportType, options?: TransportFactoryOptions): ITransport {
        const config = options?.config;

        switch (type) {
            case 'in-memory':
                return new InMemoryTransport(config);

            case 'broadcast':
                throw new Error('BroadcastChannel transport not yet implemented');

            case 'websocket':
                throw new Error('WebSocket transport not yet implemented');

            case 'http':
                throw new Error('HTTP transport not yet implemented');

            case 'stdio-mcp':
                throw new Error('STDIO MCP transport not yet implemented');

            case 'auto':
                // Auto-detect best transport for environment
                return this.createAuto(options);

            default:
                throw new Error(`Unknown transport type: ${type}`);
        }
    }

    /**
     * Auto-detect best transport for current environment
     */
    private static createAuto(options?: TransportFactoryOptions): ITransport {
        // Check if we're in browser with BroadcastChannel support
        if (typeof globalThis !== 'undefined' && 'BroadcastChannel' in globalThis) {
            throw new Error('BroadcastChannel transport not yet implemented');
        }

        // Fallback to in-memory (works in both Node and browser)
        return new InMemoryTransport(options?.config);
    }

    /**
     * Create with custom transport implementation
     */
    static custom(transport: ITransport): ITransport {
        return transport;
    }
}
