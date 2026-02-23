/**
 * Opt-in crash reporting and telemetry.
 *
 * Privacy-first approach:
 * - Disabled by default
 * - User must explicitly opt-in via Settings
 * - Only collects: crash stack traces, app version, OS info
 * - Never collects: session data, blocked sites, personal data
 * - Data sent to self-hosted endpoint (configurable)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CrashReport {
  timestamp: string;
  version: string;
  os: string;
  error: string;
  stack: string;
}

interface TelemetryConfig {
  enabled: boolean;
  endpoint: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  enabled: false,
  endpoint: "",
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let config = { ...DEFAULT_TELEMETRY_CONFIG };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function reportCrash(report: CrashReport): Promise<void> {
  if (!config.enabled || !config.endpoint) return;

  try {
    await fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    });
  } catch {
    // Silently fail -- crash reporting should never crash the app
  }
}

function buildReport(message: string, stack: string): CrashReport {
  return {
    timestamp: new Date().toISOString(),
    version: "__APP_VERSION__",
    os: navigator.platform,
    error: message,
    stack,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise the crash reporter with the provided (partial) configuration.
 *
 * When enabled, global `error` and `unhandledrejection` events are captured
 * and forwarded to the configured endpoint.
 */
export function initCrashReporter(
  userConfig: Partial<TelemetryConfig>,
): void {
  config = { ...DEFAULT_TELEMETRY_CONFIG, ...userConfig };

  if (!config.enabled) return;

  window.addEventListener("error", (event: ErrorEvent) => {
    void reportCrash(
      buildReport(event.message, event.error?.stack ?? ""),
    );
  });

  window.addEventListener(
    "unhandledrejection",
    (event: PromiseRejectionEvent) => {
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
      void reportCrash(buildReport(error.message, error.stack ?? ""));
    },
  );
}

/**
 * Toggle crash reporting on or off at runtime.
 */
export function setTelemetryEnabled(enabled: boolean): void {
  config.enabled = enabled;
}

/**
 * Returns a copy of the current telemetry configuration.
 */
export function getTelemetryConfig(): TelemetryConfig {
  return { ...config };
}

export type { CrashReport, TelemetryConfig };
