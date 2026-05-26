/**
 * Browser entry point. Re-exports the full API and will additionally
 * expose BroadcastChannel-based transport once implemented.
 * Package.json "exports" condition routes browser bundlers here.
 */

export * from './index.js';

// Future: Browser-specific exports
// export { BroadcastChannelTransport } from './transports/broadcast.js';
