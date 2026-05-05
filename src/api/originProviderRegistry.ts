import {
  VariableOrigin,
  VariableOriginProvider,
  VariableOriginRegistration,
} from '../types/originProvider';

const providers = new Map<string, VariableOriginProvider>();

export function registerOriginProvider(reg: VariableOriginRegistration): void {
  if (!reg || typeof reg.id !== 'string' || typeof reg.provider !== 'function') {
    return;
  }
  providers.set(reg.id, reg.provider);
}

export function unregisterOriginProvider(reg: { id: string }): void {
  if (!reg || typeof reg.id !== 'string') { return; }
  providers.delete(reg.id);
}

export function hasOriginProviders(): boolean {
  return providers.size > 0;
}

/**
 * Ask all registered providers for origin metadata. Last-write wins on key
 * collisions (later providers override earlier ones); registration order is
 * the iteration order of the underlying Map.
 *
 * Provider exceptions are caught and ignored so a buggy sister extension
 * cannot break the panel.
 */
export async function collectOrigins(
  uri: string,
  names: string[],
): Promise<Record<string, VariableOrigin>> {
  if (providers.size === 0 || names.length === 0) { return {}; }
  const merged: Record<string, VariableOrigin> = {};
  for (const provider of providers.values()) {
    try {
      const result = await provider({ uri, names });
      if (result && typeof result === 'object') {
        for (const [name, origin] of Object.entries(result)) {
          if (origin && typeof origin.label === 'string') {
            merged[name] = origin;
          }
        }
      }
    } catch {
      // ignore provider errors
    }
  }
  return merged;
}

/** Test/debug-only: clear all providers. Not exposed via commands. */
export function _resetOriginProviders(): void {
  providers.clear();
}
