/**
 * Mock implementation of @tauri-apps/api/event for E2E testing.
 *
 * Stores event handlers and provides an emit function to trigger them.
 * This allows tests to simulate Rust backend events in the browser.
 */

type EventHandler<T = unknown> = (event: { payload: T }) => void;

const handlers = new Map<string, Set<EventHandler>>();

export function listen<T>(
  event: string,
  handler: EventHandler<T>,
): Promise<() => void> {
  let set = handlers.get(event);
  if (!set) {
    set = new Set();
    handlers.set(event, set);
  }
  set.add(handler as EventHandler);

  const unlisten = () => {
    set.delete(handler as EventHandler);
  };

  return Promise.resolve(unlisten);
}

export function emit(event: string, payload?: unknown): Promise<void> {
  const set = handlers.get(event);
  if (set) {
    for (const handler of set) {
      handler({ payload });
    }
  }
  return Promise.resolve();
}

/** Expose emit globally so Playwright tests can trigger events */
(window as unknown as Record<string, unknown>).__TAURI_MOCK_EMIT__ = emit;

/** Clear all handlers (useful for test cleanup) */
export function clearAllListeners(): void {
  handlers.clear();
}
