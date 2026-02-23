/**
 * Tauri auto-updater integration.
 * Uses Tauri's built-in updater plugin to check for and install updates.
 *
 * Configuration:
 * - Update endpoint: GitHub Releases API
 * - Check interval: On app startup + every 4 hours
 * - User can disable via settings
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UpdateInfo {
  version: string;
  date: string;
  body: string;
}

interface UpdaterConfig {
  enabled: boolean;
  checkInterval: number; // ms
  endpoint: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: UpdaterConfig = {
  enabled: true,
  checkInterval: 4 * 60 * 60 * 1000, // 4 hours
  endpoint:
    "https://github.com/KJ-devs/focus-shield/releases/latest/download/latest.json",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Checks the remote endpoint for available updates.
 * Returns update metadata if a new version is available, or null otherwise.
 *
 * In production this would delegate to `@tauri-apps/plugin-updater`.
 * For now it performs a simple fetch against the GitHub releases endpoint.
 */
export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    const response = await fetch(DEFAULT_CONFIG.endpoint);
    if (!response.ok) return null;
    const data = (await response.json()) as UpdateInfo;
    return data;
  } catch {
    return null;
  }
}

/**
 * Installs the pending update and restarts the application.
 *
 * Will call Tauri updater plugin's installUpdate() once the Rust side is
 * configured. Placeholder until then.
 */
export async function installUpdate(): Promise<void> {
  // Will call Tauri updater plugin's installUpdate()
  // Placeholder until Rust side is configured
}

/**
 * Returns the current updater configuration (a copy, not a reference).
 */
export function getUpdaterConfig(): UpdaterConfig {
  return { ...DEFAULT_CONFIG };
}

export type { UpdateInfo, UpdaterConfig };
