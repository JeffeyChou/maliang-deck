import type { ComponentDefinition, ComponentName, RegisteredComponent } from './types.js';

export class AuthoringRegistry {
  private readonly components = new Map<ComponentName, RegisteredComponent>();
  private readonly aliases = new Map<ComponentName, ComponentName>();

  register<P>(definition: ComponentDefinition<P>): this {
    const registered: RegisteredComponent = {
      ...definition,
      canonicalName: definition.name,
    };
    this.components.set(definition.name, registered);
    return this;
  }

  alias(aliasName: ComponentName, canonicalName: ComponentName): this {
    this.aliases.set(aliasName, canonicalName);
    return this;
  }

  resolve(name: ComponentName): RegisteredComponent | undefined {
    const canonicalName = this.aliases.get(name) ?? name;
    return this.components.get(canonicalName);
  }

  list(): ComponentName[] {
    return [...this.components.keys()].sort();
  }
}

export function createAuthoringRegistry(): AuthoringRegistry {
  return new AuthoringRegistry();
}
