# iteratio-plugin-a2a

Agent-to-agent coordination plugin for iteratio.

## Install

```
npm install iteratio-plugin-a2a
```

## What It Does

Provides infrastructure for multi-agent communication: AgentRegistry, ChannelManager, MessageBus, and Transport. Agents coordinate through IRC-style channels with structured messages. The plugin provides the plumbing; you register whichever tools you need.

## Usage

```typescript
import { A2APlugin } from 'iteratio-plugin-a2a';
import { spawnWorkerTool, broadcastToWorkersTool } from 'iteratio-plugin-a2a/tools';

const a2a = new A2APlugin();
a2a.configure({ pattern: 'both', transport: { type: 'in-memory' } });
await a2a.initialize(container);

// Register only the tools you want
a2a.registerTool(spawnWorkerTool);
a2a.registerTool(broadcastToWorkersTool);

// Access infrastructure directly
const { agentManager, channelManager } = a2a.getInfrastructure();
```

## License

MIT
