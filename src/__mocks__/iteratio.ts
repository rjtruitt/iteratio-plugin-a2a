/**
 * Mock for the iteratio package (peer dependency)
 */

export interface IPlugin {
  name: string;
  version: string;
  initialize(container: any): Promise<void>;
  configure?(config: any): void;
  beforeTurn?(context: any): Promise<void>;
  afterTurn?(context: any): Promise<void>;
  shutdown?(): Promise<void>;
}

export interface PluginConfig {
  [key: string]: unknown;
}

export interface TurnContext {
  turnNumber: number;
  turnCount: number;
  messages: Array<{ role: string; content: string }>;
  state: Record<string, any>;
}
