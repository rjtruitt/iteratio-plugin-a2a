/**
 * Simplified event bus for test isolation.
 *
 * Uses a flat (eventType, data) signature instead of the structured HiveEvent
 * objects required by core/events/HiveEventBus. This makes test assertions
 * simpler while exercising the same pub/sub semantics.
 */

type Handler = (data: unknown) => void | Promise<void>;

export class HiveEventBus {
  private handlers: Map<string, Set<Handler>> = new Map();
  private _totalEmitted: number = 0;

  on(event: string, handler: Handler): this {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return this;
  }

  once(event: string, handler: Handler): this {
    const wrapper: Handler = (data) => {
      this.off(event, wrapper);
      return handler(data);
    };
    return this.on(event, wrapper);
  }

  off(event: string, handler: Handler): this {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) this.handlers.delete(event);
    }
    return this;
  }

  removeAllListeners(event?: string): this {
    if (event === undefined) {
      this.handlers.clear();
    } else {
      this.handlers.delete(event);
    }
    return this;
  }

  emit(event: string, data: unknown): void {
    this._totalEmitted++;
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      handler(data);
    }
  }

  async waitFor(event: string, timeoutMs?: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const handler: Handler = (data) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(data);
      };

      this.once(event, handler);

      if (timeoutMs !== undefined) {
        timeoutId = setTimeout(() => {
          this.off(event, handler);
          reject(new Error(`Timeout waiting for event: ${event}`));
        }, timeoutMs);
      }
    });
  }

  listenerCount(event: string): number {
    return this.handlers.get(event)?.size ?? 0;
  }

  eventNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  getMetrics(): { totalEmitted: number; listenerCount: number } {
    let totalListeners = 0;
    for (const set of this.handlers.values()) {
      totalListeners += set.size;
    }
    return { totalEmitted: this._totalEmitted, listenerCount: totalListeners };
  }

  resetMetrics(): void {
    this._totalEmitted = 0;
  }
}
