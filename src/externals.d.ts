/**
 * Ambient type declarations for peer dependencies that may not be installed
 * during type-checking. These minimal declarations satisfy the compiler.
 */

declare module 'iteratio' {
  export interface IPlugin {
    readonly name: string;
    readonly version: string;
    initialize(container: import("inversify").Container): Promise<void>;
    configure?(config: PluginConfig): void;
    beforeTurn?(context: TurnContext): Promise<void>;
    afterTurn?(context: TurnContext): Promise<void>;
    shutdown?(): Promise<void>;
  }

  export interface PluginConfig {
    [key: string]: unknown;
  }

  export interface TurnContext {
    turnNumber: number;
    turnCount: number;
    messages: Array<{ role: string; content: string }>;
    state: Record<string, unknown>;
  }
}

declare module 'inversify' {
  export class Container {
    bind(identifier: string): { toConstantValue(value: any): void };
    get<T>(identifier: string): T;
  }
}
