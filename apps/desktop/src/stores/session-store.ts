import { create } from "zustand";
import type { LockLevel, SessionBlock } from "@focus-shield/shared-types";
import { daemonStartBlocking, daemonStopBlocking } from "@/tauri/daemon";
import { useBlocklistStore } from "@/stores/blocklist-store";
import type { DaemonDomainRule, DaemonProcessRule } from "@focus-shield/shared-types";
import { toastWarning, toastInfo, toastError } from "@/stores/notification-store";
import {
  sessionStart,
  sessionStop,
  sessionRequestUnlock,
  sessionCancelUnlock,
  sessionDismiss,
  sessionStatus,
  type SessionPhase as RustPhase,
  type SessionReview,
  type TickPayload,
  type PhaseChangedPayload,
  type SessionCompletedPayload,
  type TokenDisplayPayload,
} from "@/tauri/session";
import {
  storageSaveSessionRun,
  storageGetTodayStats,
  type TodayStats as StorageTodayStats,
} from "@/tauri/storage";
import { listen } from "@tauri-apps/api/event";

// ---------------------------------------------------------------------------
// Token config (kept for UI display purposes only)
// ---------------------------------------------------------------------------

export interface TokenLevelConfig {
  readonly level: LockLevel;
  readonly name: string;
  readonly length: number;
  readonly pasteAllowed: boolean;
  readonly cooldownBeforeEntry: boolean;
  readonly cooldownMs: number;
  readonly description: string;
}

export const TOKEN_CONFIG: Record<LockLevel, TokenLevelConfig> = {
  1: {
    level: 1, name: "Gentle", length: 8,
    pasteAllowed: true, cooldownBeforeEntry: false, cooldownMs: 0,
    description: "8 alphanumeric characters, paste allowed",
  },
  2: {
    level: 2, name: "Moderate", length: 16,
    pasteAllowed: false, cooldownBeforeEntry: false, cooldownMs: 0,
    description: "16 mixed characters, no paste",
  },
  3: {
    level: 3, name: "Strict", length: 32,
    pasteAllowed: false, cooldownBeforeEntry: true, cooldownMs: 60_000,
    description: "32 mixed + symbols, 60s cooldown before entry",
  },
  4: {
    level: 4, name: "Hardcore", length: 48,
    pasteAllowed: false, cooldownBeforeEntry: true, cooldownMs: 120_000,
    description: "48 mixed + symbols, 120s cooldown, double entry required",
  },
  5: {
    level: 5, name: "Nuclear", length: 0,
    pasteAllowed: false, cooldownBeforeEntry: false, cooldownMs: 0,
    description: "No token — session is uninterruptible",
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Frontend phase — mapped from Rust's SessionPhase */
export type SessionPhase =
  | "idle"
  | "configuring"
  | "token-display"
  | "active"
  | "unlock-prompt"
  | "review";

export interface SessionConfig {
  presetId: string;
  presetName: string;
  lockLevel: LockLevel;
  durationMs: number;
  blocks: SessionBlock[];
}

export { type SessionReview } from "@/tauri/session";

export interface TodayStats {
  focusMinutes: number;
  sessionsCompleted: number;
  distractionsBlocked: number;
  currentStreak: number;
}

export interface SessionState {
  phase: SessionPhase;
  config: SessionConfig | null;
  token: string | null;
  sessionRunId: string | null;
  tokenCountdown: number;
  timeRemainingMs: number;
  currentBlockIndex: number;
  distractionCount: number;
  startedAt: number | null;
  todayStats: TodayStats;
  review: SessionReview | null;

  // Derived for backward compat
  isSessionActive: boolean;
  currentSessionName: string | null;

  // Error state
  lastError: string | null;

  // Actions
  startConfiguring: () => void;
  setConfig: (config: SessionConfig) => void;
  launchSession: () => Promise<void>;
  requestUnlock: () => Promise<void>;
  cancelUnlock: () => Promise<void>;
  stopSession: (token?: string) => Promise<void>;
  dismissReview: () => Promise<void>;
  startQuickSession: (name: string, durationMs: number) => Promise<void>;

  // Legacy compat (no-ops that delegate to new actions)
  generateAndShowToken: () => void;
  tokenCountdownTick: () => void;
  tick: () => void;
  startSession: () => void;
  completeSession: () => void;
  forceStop: (wasUnlocked: boolean) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEnabledBlockingRules(): {
  domains: DaemonDomainRule[];
  processes: DaemonProcessRule[];
} {
  const blocklists = useBlocklistStore.getState().blocklists;
  const enabled = blocklists.filter((b) => b.enabled);

  const domains: DaemonDomainRule[] = enabled.flatMap((b) =>
    b.domains.map((pattern) => ({ pattern })),
  );

  const processes: DaemonProcessRule[] = enabled.flatMap((b) =>
    b.processes.map((p) => ({ name: p.name, aliases: p.aliases, action: p.action })),
  );

  return { domains, processes };
}

/** Track which session run has already activated blocking to prevent double calls. */
let activeBlockingRunId: string | null = null;

async function activateBlocking(sessionRunId: string): Promise<void> {
  // Prevent double activation for the same session run
  if (activeBlockingRunId === sessionRunId) return;

  try {
    const { domains, processes } = getEnabledBlockingRules();
    if (domains.length === 0 && processes.length === 0) return;
    await daemonStartBlocking(sessionRunId, domains, processes);
    activeBlockingRunId = sessionRunId;
  } catch {
    toastWarning("System blocking unavailable. Browser extension blocking is still active.");
  }
}

async function deactivateBlocking(sessionRunId: string): Promise<void> {
  activeBlockingRunId = null;
  try {
    await daemonStopBlocking(sessionRunId);
  } catch {
    toastInfo("Daemon did not respond. Blocking will be cleaned up on next startup.");
  }
}

function mapRustPhase(phase: RustPhase): SessionPhase {
  switch (phase) {
    case "idle": return "idle";
    case "token-display": return "token-display";
    case "active": return "active";
    case "unlock-prompt": return "unlock-prompt";
    case "paused": return "active"; // treat paused as active for now
    case "completed": return "review";
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const INITIAL_TODAY_STATS: TodayStats = {
  focusMinutes: 0,
  sessionsCompleted: 0,
  distractionsBlocked: 0,
  currentStreak: 0,
};

export const useSessionStore = create<SessionState>((set, get) => ({
  phase: "idle",
  config: null,
  token: null,
  sessionRunId: null,
  tokenCountdown: 0,
  timeRemainingMs: 0,
  currentBlockIndex: 0,
  distractionCount: 0,
  startedAt: null,
  todayStats: INITIAL_TODAY_STATS,
  review: null,
  isSessionActive: false,
  currentSessionName: null,
  lastError: null,

  startConfiguring: () => {
    set({
      phase: "configuring",
      config: null,
      token: null,
      tokenCountdown: 0,
      review: null,
      lastError: null,
    });
  },

  setConfig: (config: SessionConfig) => {
    set({ config });
  },

  launchSession: async () => {
    const { config } = get();
    if (!config) return;

    try {
      const result = await sessionStart({
        presetId: config.presetId,
        presetName: config.presetName,
        lockLevel: config.lockLevel,
        durationMs: config.durationMs,
        blocks: config.blocks,
      });

      // Token returned from Rust (empty for level 5)
      if (result.token) {
        set({
          phase: "token-display",
          token: result.token,
          sessionRunId: result.snapshot.runId,
          tokenCountdown: result.snapshot.tokenCountdown,
          timeRemainingMs: result.snapshot.timeRemainingMs,
          lastError: null,
        });
      } else {
        // Level 5 or immediate start
        set({
          phase: mapRustPhase(result.snapshot.phase),
          token: null,
          sessionRunId: result.snapshot.runId,
          tokenCountdown: 0,
          timeRemainingMs: result.snapshot.timeRemainingMs,
          currentBlockIndex: 0,
          distractionCount: 0,
          startedAt: result.snapshot.startedAt,
          isSessionActive: true,
          currentSessionName: config.presetName,
          lastError: null,
        });
        if (result.snapshot.runId) {
          void activateBlocking(result.snapshot.runId);
        }

        // Sync state from Rust to guard against missed early ticks
        void syncSessionStatus();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ lastError: message });
      toastError(message);
    }
  },

  requestUnlock: async () => {
    try {
      await sessionRequestUnlock();
      set({ phase: "unlock-prompt" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ lastError: message });
      toastError(message);
    }
  },

  cancelUnlock: async () => {
    try {
      await sessionCancelUnlock();
      set({ phase: "active" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ lastError: message });
      toastError(message);
    }
  },

  stopSession: async (token?: string) => {
    const state = get();

    // For lock level 1 or if no token needed, stop directly
    if (state.config && state.config.lockLevel > 1 && state.phase === "active") {
      // Show unlock prompt first
      try {
        await sessionRequestUnlock();
        set({ phase: "unlock-prompt" });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        set({ lastError: message });
      }
      return;
    }

    try {
      const review = await sessionStop(token);

      if (state.sessionRunId) {
        void deactivateBlocking(state.sessionRunId);
      }

      set({
        phase: "review",
        timeRemainingMs: 0,
        isSessionActive: false,
        currentSessionName: null,
        review,
        lastError: null,
      });

      // Persist session run on manual stop (same as session:completed handler)
      if (state.sessionRunId) {
        void persistSessionRun(state.sessionRunId, state, review);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ lastError: message });
      toastError(message);
    }
  },

  dismissReview: async () => {
    try {
      await sessionDismiss();
      set({
        phase: "idle",
        config: null,
        token: null,
        sessionRunId: null,
        tokenCountdown: 0,
        timeRemainingMs: 0,
        currentBlockIndex: 0,
        distractionCount: 0,
        startedAt: null,
        review: null,
        isSessionActive: false,
        currentSessionName: null,
        lastError: null,
      });
    } catch {
      toastInfo("Session dismissed locally.");
      set({ phase: "idle", review: null });
    }
  },

  startQuickSession: async (name: string, durationMs: number) => {
    const config: SessionConfig = {
      presetId: "quick",
      presetName: name,
      lockLevel: 1,
      durationMs,
      blocks: [{ type: "focus", duration: durationMs / 60000, blockingEnabled: true }],
    };

    set({ config });

    try {
      const result = await sessionStart({
        presetId: config.presetId,
        presetName: config.presetName,
        lockLevel: config.lockLevel,
        durationMs: config.durationMs,
        blocks: config.blocks,
      });

      set({
        phase: mapRustPhase(result.snapshot.phase),
        token: null,
        sessionRunId: result.snapshot.runId,
        tokenCountdown: 0,
        timeRemainingMs: result.snapshot.timeRemainingMs,
        currentBlockIndex: 0,
        distractionCount: 0,
        startedAt: result.snapshot.startedAt,
        isSessionActive: true,
        currentSessionName: name,
        review: null,
        lastError: null,
      });

      if (result.snapshot.runId) {
        void activateBlocking(result.snapshot.runId);
      }

      // Sync state from Rust to guard against missed early ticks
      void syncSessionStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ lastError: message });
      toastError(message);
    }
  },

  // -------------------------------------------------------------------------
  // Legacy compat — these delegate to new async actions or are no-ops.
  // The timer now runs in Rust, so tick() is not called from React anymore.
  // -------------------------------------------------------------------------

  generateAndShowToken: () => {
    // Delegate to launchSession which handles token generation via Rust
    void get().launchSession();
  },

  tokenCountdownTick: () => {
    // No-op: countdown is driven by Rust events now
  },

  tick: () => {
    // No-op: timer ticks come from Rust events now
  },

  startSession: () => {
    // Delegate to launchSession
    void get().launchSession();
  },

  completeSession: () => {
    // Handled by Rust session:completed event
  },

  forceStop: (_wasUnlocked: boolean) => {
    void get().stopSession();
  },
}));

// ---------------------------------------------------------------------------
// Tauri event listeners — sync Rust state → Zustand
// ---------------------------------------------------------------------------

/**
 * Fetch current session status from Rust and update the store.
 * Used after sessionStart() to guard against missed early ticks (race condition),
 * and as a fallback re-sync 2 seconds after session start.
 */
async function syncSessionStatus(): Promise<void> {
  try {
    const snapshot = await sessionStatus();
    if (snapshot.phase !== "idle") {
      const phase = mapRustPhase(snapshot.phase);
      useSessionStore.setState({
        phase,
        sessionRunId: snapshot.runId,
        timeRemainingMs: snapshot.timeRemainingMs,
        currentBlockIndex: snapshot.currentBlockIndex,
        distractionCount: snapshot.distractionCount,
        startedAt: snapshot.startedAt,
        isSessionActive: phase === "active" || phase === "unlock-prompt",
        currentSessionName: snapshot.presetName,
      });
    }
  } catch {
    // Not running in Tauri — ignore
  }

  // Fallback: re-sync after 2 seconds in case early ticks were lost
  setTimeout(() => {
    const state = useSessionStore.getState();
    if (state.isSessionActive) {
      void sessionStatus().then((snapshot) => {
        if (snapshot.phase !== "idle") {
          useSessionStore.setState({
            timeRemainingMs: snapshot.timeRemainingMs,
            currentBlockIndex: snapshot.currentBlockIndex,
            distractionCount: snapshot.distractionCount,
          });
        }
      }).catch(() => { /* ignore */ });
    }
  }, 2000);
}

/** Initialize event listeners. Call once at app startup. */
export function initSessionListeners(): void {
  // Timer tick from Rust (every second)
  void listen<TickPayload>("session:tick", (event) => {
    useSessionStore.setState({
      timeRemainingMs: event.payload.timeRemainingMs,
      currentBlockIndex: event.payload.currentBlockIndex,
    });
  });

  // Phase changed
  void listen<PhaseChangedPayload>("session:phase_changed", (event) => {
    const { snapshot } = event.payload;
    const phase = mapRustPhase(snapshot.phase);

    useSessionStore.setState({
      phase,
      sessionRunId: snapshot.runId,
      timeRemainingMs: snapshot.timeRemainingMs,
      currentBlockIndex: snapshot.currentBlockIndex,
      distractionCount: snapshot.distractionCount,
      startedAt: snapshot.startedAt,
      tokenCountdown: snapshot.tokenCountdown,
      isSessionActive: phase === "active" || phase === "unlock-prompt",
      currentSessionName: snapshot.presetName,
    });

    // Activate blocking when session becomes active
    if (phase === "active" && snapshot.runId) {
      void activateBlocking(snapshot.runId);
    }

    // Deactivate blocking when session completes
    if (phase === "review" && snapshot.runId) {
      void deactivateBlocking(snapshot.runId);
    }
  });

  // Session completed
  void listen<SessionCompletedPayload>("session:completed", (event) => {
    const state = useSessionStore.getState();
    const runId = state.sessionRunId;
    if (runId) {
      void deactivateBlocking(runId);
    }

    const review = event.payload.review;

    useSessionStore.setState({
      phase: "review",
      timeRemainingMs: 0,
      isSessionActive: false,
      currentSessionName: null,
      review,
    });

    // Persist session run to SQLite
    if (runId) {
      void persistSessionRun(runId, state, review);
    }
  });

  // Token display events
  void listen<TokenDisplayPayload>("session:token_display", (event) => {
    useSessionStore.setState({
      phase: "token-display",
      token: event.payload.token,
      tokenCountdown: event.payload.countdown,
    });
  });

  // Token countdown
  void listen<{ countdown: number }>("session:token_countdown", (event) => {
    useSessionStore.setState({
      tokenCountdown: event.payload.countdown,
    });
  });

  // Sync state on startup (in case app restarted during a session)
  void sessionStatus().then((snapshot) => {
    if (snapshot.phase !== "idle") {
      const phase = mapRustPhase(snapshot.phase);
      useSessionStore.setState({
        phase,
        sessionRunId: snapshot.runId,
        timeRemainingMs: snapshot.timeRemainingMs,
        currentBlockIndex: snapshot.currentBlockIndex,
        distractionCount: snapshot.distractionCount,
        startedAt: snapshot.startedAt,
        isSessionActive: phase === "active" || phase === "unlock-prompt",
        currentSessionName: snapshot.presetName,
      });
    }
  }).catch(() => {
    // Not running in Tauri (e.g., browser dev mode) — ignore
  });

  // Hydrate today stats from SQLite
  void loadTodayStats();
}

async function persistSessionRun(
  runId: string,
  state: SessionState,
  review: SessionReview,
): Promise<void> {
  try {
    const startedAt = state.startedAt
      ? new Date(state.startedAt).toISOString()
      : new Date().toISOString();

    await storageSaveSessionRun({
      id: runId,
      sessionId: state.config?.presetId ?? "unknown",
      startedAt,
      endedAt: new Date().toISOString(),
      status: review.completedNormally ? "completed" : "aborted",
      distractionCount: review.distractionCount,
      focusScore: review.focusScore,
      totalFocusMinutes: review.actualFocusMs / 60_000,
      totalBreakMinutes: (review.totalDurationMs - review.actualFocusMs) / 60_000,
      completedNormally: review.completedNormally,
    });

    // Refresh today stats after persisting
    await loadTodayStats();
  } catch {
    toastError("Failed to save session data. Your session was completed but stats may be incomplete.");
  }
}

async function loadTodayStats(): Promise<void> {
  try {
    const stats: StorageTodayStats = await storageGetTodayStats();
    useSessionStore.setState({
      todayStats: {
        focusMinutes: Math.round(stats.focusMinutes),
        sessionsCompleted: stats.sessionsCompleted,
        distractionsBlocked: stats.distractionsBlocked,
        currentStreak: stats.currentStreak,
      },
    });
  } catch {
    // Not running in Tauri (e.g., browser dev mode) or DB not ready — ignore
  }
}
