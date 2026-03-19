import { useEffect, useState, useCallback } from "react";
import { BLOCKLIST_PRESETS } from "@focus-shield/blocker-core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BlockingState {
  isActive: boolean;
  sessionId: string | null;
  blockedDomains: string[];
  startedAt: string | null;
  endTime: string | null;
  distractionCount: number;
}

interface PresetConfig {
  label: string;
  durationMinutes: number;
  categories: Array<"social" | "entertainment" | "gaming" | "news" | "shopping">;
  color: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRESETS: PresetConfig[] = [
  {
    label: "Pomodoro 25min",
    durationMinutes: 25,
    categories: ["social", "entertainment"],
    color: "#e74c3c",
  },
  {
    label: "Deep Work 90min",
    durationMinutes: 90,
    categories: ["social", "entertainment", "gaming", "news", "shopping"],
    color: "#4361ee",
  },
  {
    label: "Quick Focus 15min",
    durationMinutes: 15,
    categories: ["social"],
    color: "#2ecc71",
  },
];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  container: {
    width: "360px",
    padding: "0",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    background: "#1a1a2e",
    color: "#ffffff",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "16px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },
  headerIcon: {
    fontSize: "24px",
  },
  headerTitle: {
    fontSize: "18px",
    fontWeight: 700 as const,
    flex: 1,
  },
  statusBadge: (active: boolean) => ({
    fontSize: "11px",
    fontWeight: 600 as const,
    padding: "3px 10px",
    borderRadius: "12px",
    background: active ? "rgba(46, 204, 113, 0.2)" : "rgba(160, 174, 192, 0.2)",
    color: active ? "#2ecc71" : "#a0aec0",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  }),
  body: {
    padding: "20px",
  },
  // Active session styles
  timerDisplay: {
    fontSize: "48px",
    fontWeight: 700 as const,
    textAlign: "center" as const,
    color: "#4361ee",
    marginBottom: "8px",
    fontVariantNumeric: "tabular-nums",
  },
  timerLabel: {
    fontSize: "13px",
    textAlign: "center" as const,
    color: "#a0aec0",
    marginBottom: "20px",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
  },
  distractionRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    marginBottom: "20px",
    color: "#a0aec0",
    fontSize: "14px",
  },
  distractionCount: {
    fontWeight: 700 as const,
    color: "#e74c3c",
    fontSize: "18px",
  },
  stopButton: {
    width: "100%",
    padding: "12px",
    fontSize: "15px",
    fontWeight: 600 as const,
    color: "#ffffff",
    background: "#e74c3c",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  // Inactive styles
  sectionTitle: {
    fontSize: "13px",
    color: "#a0aec0",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    marginBottom: "12px",
  },
  presetButton: (color: string) => ({
    width: "100%",
    padding: "12px 16px",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: 600 as const,
    color: "#ffffff",
    background: color,
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    textAlign: "left" as const,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  }),
  presetMeta: {
    fontSize: "12px",
    opacity: 0.8,
  },
  // Footer
  footer: {
    padding: "12px 20px",
    borderTop: "1px solid rgba(255,255,255,0.1)",
    textAlign: "center" as const,
    fontSize: "11px",
    color: "#4a5568",
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number): string => String(n).padStart(2, "0");
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

function getDomainsForCategories(
  categories: PresetConfig["categories"],
): string[] {
  const domains: string[] = [];
  for (const cat of categories) {
    const preset = BLOCKLIST_PRESETS[cat];
    for (const rule of preset.domains) {
      if (rule.type === "block") {
        domains.push(rule.pattern);
      }
    }
  }
  return domains;
}

function generateSessionId(): string {
  return `ext-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Popup() {
  const [state, setState] = useState<BlockingState | null>(null);
  const [timeDisplay, setTimeDisplay] = useState("--:--");
  const [loading, setLoading] = useState(true);

  const loadState = useCallback(() => {
    (chrome.runtime.sendMessage({ type: "GET_STATE" }) as unknown as Promise<unknown>)
      .then((response: unknown) => {
        const blockingState = response as BlockingState;
        setState(blockingState);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // Load initial state and set up timer
  useEffect(() => {
    loadState();
  }, [loadState]);

  // Timer countdown
  const isActive = state?.isActive ?? false;
  const endTimeStr = state?.endTime ?? null;

  useEffect(() => {
    if (!isActive || !endTimeStr) return;

    const endMs = new Date(endTimeStr).getTime();

    function tick(): void {
      const remaining = endMs - Date.now();
      if (remaining <= 0) {
        setTimeDisplay("00:00");
        loadState(); // Refresh state -- session may have ended
      } else {
        setTimeDisplay(formatTimeRemaining(remaining));
      }
    }

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [isActive, endTimeStr, loadState]);

  function handleStartPreset(preset: PresetConfig): void {
    const domains = getDomainsForCategories(preset.categories);
    const endTime = new Date(
      Date.now() + preset.durationMinutes * 60_000,
    ).toISOString();
    const sessionId = generateSessionId();

    (chrome.runtime.sendMessage({
      type: "ACTIVATE_BLOCKING",
      domains,
      sessionId,
      endTime,
    }) as unknown as Promise<unknown>)
      .then(() => { loadState(); })
      .catch(() => { loadState(); });
  }

  function handleStop(): void {
    (chrome.runtime.sendMessage({ type: "DEACTIVATE_BLOCKING" }) as unknown as Promise<unknown>)
      .then(() => { loadState(); })
      .catch(() => { loadState(); });
  }

  if (loading) {
    return (
      <div style={{ ...styles.container, padding: "40px", textAlign: "center" }}>
        <p style={{ color: "#a0aec0" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>{"\u{1F6E1}\u{FE0F}"}</span>
        <span style={styles.headerTitle}>Focus Shield</span>
        <span style={styles.statusBadge(isActive)}>
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Body */}
      <div style={styles.body}>
        {isActive ? (
          <>
            <div style={styles.timerDisplay}>{timeDisplay}</div>
            <div style={styles.timerLabel}>Time Remaining</div>

            <div style={styles.distractionRow}>
              <span>Distractions blocked:</span>
              <span style={styles.distractionCount}>
                {state?.distractionCount ?? 0}
              </span>
            </div>

            <button style={styles.stopButton} onClick={handleStop}>
              Stop Session
            </button>
          </>
        ) : (
          <>
            <p style={styles.sectionTitle}>Quick Start</p>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                style={styles.presetButton(preset.color)}
                onClick={() => handleStartPreset(preset)}
              >
                <span>{preset.label}</span>
                <span style={styles.presetMeta}>
                  {preset.categories.length === 5
                    ? "All categories"
                    : preset.categories.join(", ")}
                </span>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>Focus Shield v0.1.0</div>
    </div>
  );
}
