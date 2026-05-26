/**
 * Minimal transport for test-facing API. Avoids the validation/timeout
 * overhead of core/transport/BaseTransport while providing the same
 * subscribe/send/publish interface tests exercise.
 */

type Handler = (message: any) => void | Promise<void>;

export class BaseTransport {
  protected handlers: Map<string, Handler[]> = new Map();
  protected _connected: boolean = true;
  protected _metrics = { sent: 0, received: 0, errors: 0 };

  async send(target: string, message: any): Promise<void> {
    this._metrics.sent++;
    const handlers = this.handlers.get(target);
    if (handlers) {
      for (const h of handlers) {
        await h(message);
      }
    }
  }

  async publish(channel: string, message: any): Promise<void> {
    this._metrics.sent++;
    const handlers = this.handlers.get(channel);
    if (handlers) {
      for (const h of handlers) {
        await h(message);
      }
    }
  }

  subscribe(channel: string, handler: Handler): void {
    let arr = this.handlers.get(channel);
    if (!arr) {
      arr = [];
      this.handlers.set(channel, arr);
    }
    arr.push(handler);
  }

  unsubscribe(channel: string, handler: Handler): void {
    const arr = this.handlers.get(channel);
    if (arr) {
      const idx = arr.indexOf(handler);
      if (idx !== -1) arr.splice(idx, 1);
      if (arr.length === 0) this.handlers.delete(channel);
    }
  }

  async disconnect(): Promise<void> {
    this._connected = false;
    this.handlers.clear();
  }

  getConnected(): boolean {
    return this._connected;
  }

  getMetrics(): { sent: number; received: number; errors: number } {
    return { ...this._metrics };
  }

  resetMetrics(): void {
    this._metrics = { sent: 0, received: 0, errors: 0 };
  }
}
