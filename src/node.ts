/**
 * Node.js entry point. Re-exports the full API and will additionally
 * expose STDIO MCP transport once implemented.
 * Package.json "exports" condition routes Node.js imports here.
 */

export * from './index.js';

// Future: Node-specific exports
// export { StdioMcpTransport } from './transports/stdio-mcp.js';
