/**
 * Dependencies injected into {@link detectExtendsCycle}. Kept abstract so the
 * cycle walk stays pure (no `vscode`, no filesystem) and unit-testable.
 */
export interface ExtendsCycleDeps {
  /**
   * Raw `{% extends %}` path string of the template at `fsPath`, or `null`
   * when the template has no `extends`.
   */
  readExtendsPath(fsPath: string): Promise<string | null>;
  /**
   * Resolve a raw extends path (as written inside `fromFsPath`) to an absolute
   * filesystem path, or `null` when it cannot be resolved.
   */
  resolvePath(rawPath: string, fromFsPath: string): Promise<string | null>;
}

/** Safety bound so a pathological chain can never spin forever. */
const MAX_EXTENDS_DEPTH = 50;

/**
 * Walk the `{% extends %}` chain starting at `startFsPath` and report whether
 * it loops back on itself. Returns `false` as soon as the chain ends or a link
 * cannot be resolved (an unresolved link is an `JHE1101`, not a cycle).
 */
export async function detectExtendsCycle(
  startFsPath: string,
  deps: ExtendsCycleDeps
): Promise<boolean> {
  const visited = new Set<string>([startFsPath]);
  let cursor = startFsPath;

  for (let depth = 0; depth < MAX_EXTENDS_DEPTH; depth++) {
    const raw = await deps.readExtendsPath(cursor);
    if (!raw) {
      return false;
    }
    const next = await deps.resolvePath(raw, cursor);
    if (!next) {
      return false;
    }
    if (visited.has(next)) {
      return true;
    }
    visited.add(next);
    cursor = next;
  }

  // Exceeded the depth bound without terminating — treat as a cycle so the
  // problem surfaces instead of silently passing.
  return true;
}
