/**
 * Mock for inversify DI container
 */

export class Container {
  private bindings: Map<string, any> = new Map();

  bind(identifier: string) {
    return {
      toConstantValue: (value: any) => {
        this.bindings.set(identifier, value);
      },
    };
  }

  get(identifier: string) {
    return this.bindings.get(identifier);
  }
}
