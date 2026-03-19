/**
 * Mock implementation of @tauri-apps/api/core for E2E testing.
 *
 * Simulates the Rust backend session manager, storage, and daemon.
 * The mock session manager runs a real timer, emits events, and
 * persists session data in memory.
 */

import { emit } from "./mock-tauri-event";

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

interface MockSessionState {
  phase: "idle" | "token-display" | "active" | "unlock-prompt" | "completed";
  runId: string | null;
  presetName: string | null;
  lockLevel: number;
  token: string | null;
  tokenHash: string | null;
  durationMs: number;
  timeRemainingMs: number;
  currentBlockIndex: number;
  distractionCount: number;
  startedAt: number | null;
  tokenCountdown: number;
  timerId: ReturnType<typeof setInterval> | null;
  tokenTimerId: ReturnType<typeof setInterval> | null;
  unlockAttempts: number;
  cooldownUntil: number;
}

interface MockSessionRun {
  id: string;
  sessionId: string;
  startedAt: string;
  endedAt: string;
  status: string;
  distractionCount: number;
  focusScore: number;
  totalFocusMinutes: number;
  totalBreakMinutes: number;
  completedNormally: boolean;
}

interface MockDailyStats {
  focusMinutes: number;
  sessionsCompleted: number;
  distractionsBlocked: number;
  currentStreak: number;
}

const session: MockSessionState = {
  phase: "idle",
  runId: null,
  presetName: null,
  lockLevel: 1,
  token: null,
  tokenHash: null,
  durationMs: 0,
  timeRemainingMs: 0,
  currentBlockIndex: 0,
  distractionCount: 0,
  startedAt: null,
  tokenCountdown: 0,
  timerId: null,
  tokenTimerId: null,
  unlockAttempts: 0,
  cooldownUntil: 0,
};

const sessionRuns: MockSessionRun[] = [];
let todayStats: MockDailyStats = {
  focusMinutes: 0,
  sessionsCompleted: 0,
  distractionsBlocked: 0,
  currentStreak: 0,
};

// ---------------------------------------------------------------------------
// Token generation
// ---------------------------------------------------------------------------

const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const MIXED_SYMBOLS = ALPHANUMERIC + "!@#$%^&*()-_=+[]{}|;:,.<>?";

function generateToken(lockLevel: number): string {
  const lengths: Record<number, number> = { 1: 8, 2: 16, 3: 32, 4: 48, 5: 0 };
  const length = lengths[lockLevel] ?? 8;
  if (length === 0) return "";

  const charset = lockLevel >= 3 ? MIXED_SYMBOLS : ALPHANUMERIC;
  let token = "";
  for (let i = 0; i < length; i++) {
    token += charset[Math.floor(Math.random() * charset.length)];
  }
  return token;
}

function generateRunId(): string {
  return `mock-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Timer logic
// ---------------------------------------------------------------------------

function startSessionTimer(): void {
  if (session.timerId) clearInterval(session.timerId);

  session.timerId = setInterval(() => {
    if (session.phase !== "active" && session.phase !== "unlock-prompt") return;

    session.timeRemainingMs -= 1000;
    if (session.timeRemainingMs < 0) session.timeRemainingMs = 0;

    void emit("session:tick", {
      timeRemainingMs: session.timeRemainingMs,
      currentBlockIndex: session.currentBlockIndex,
      phase: session.phase,
    });

    if (session.timeRemainingMs <= 0) {
      completeSession(true);
    }
  }, 1000);
}

function startTokenCountdown(): void {
  session.tokenCountdown = 3; // Shorter countdown for E2E tests (production uses 10)

  void emit("session:token_display", {
    token: session.token,
    countdown: session.tokenCountdown,
    lockLevel: session.lockLevel,
  });

  session.tokenTimerId = setInterval(() => {
    session.tokenCountdown--;

    void emit("session:token_countdown", {
      countdown: session.tokenCountdown,
    });

    if (session.tokenCountdown <= 0) {
      if (session.tokenTimerId) clearInterval(session.tokenTimerId);
      session.tokenTimerId = null;

      // Transition to active
      session.phase = "active";
      session.startedAt = Date.now();

      void emit("session:phase_changed", {
        phase: "active",
        snapshot: getSnapshot(),
      });

      startSessionTimer();
    }
  }, 1000);
}

function completeSession(completedNormally: boolean): void {
  if (session.timerId) clearInterval(session.timerId);
  if (session.tokenTimerId) clearInterval(session.tokenTimerId);
  session.timerId = null;
  session.tokenTimerId = null;

  session.phase = "completed";
  const elapsed = session.durationMs - session.timeRemainingMs;
  const completionPct = session.durationMs > 0 ? elapsed / session.durationMs : 1;
  const focusScore = Math.max(
    0,
    Math.min(100, Math.round(completionPct * 100 - session.distractionCount * 5)),
  );

  const review = {
    sessionName: session.presetName ?? "Unknown",
    totalDurationMs: session.durationMs,
    actualFocusMs: elapsed,
    distractionCount: session.distractionCount,
    completedNormally,
    focusScore,
  };

  void emit("session:completed", { review });
}

function getSnapshot() {
  return {
    phase: session.phase,
    runId: session.runId,
    presetName: session.presetName,
    lockLevel: session.lockLevel,
    timeRemainingMs: session.timeRemainingMs,
    totalDurationMs: session.durationMs,
    currentBlockIndex: session.currentBlockIndex,
    distractionCount: session.distractionCount,
    startedAt: session.startedAt,
    tokenCountdown: session.tokenCountdown,
  };
}

function resetSession(): void {
  if (session.timerId) clearInterval(session.timerId);
  if (session.tokenTimerId) clearInterval(session.tokenTimerId);
  session.phase = "idle";
  session.runId = null;
  session.presetName = null;
  session.lockLevel = 1;
  session.token = null;
  session.tokenHash = null;
  session.durationMs = 0;
  session.timeRemainingMs = 0;
  session.currentBlockIndex = 0;
  session.distractionCount = 0;
  session.startedAt = null;
  session.tokenCountdown = 0;
  session.timerId = null;
  session.tokenTimerId = null;
  session.unlockAttempts = 0;
  session.cooldownUntil = 0;
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

type CommandHandler = (args: Record<string, unknown>) => unknown;

const commands: Record<string, CommandHandler> = {
  session_start: (args) => {
    const payload = args.payload as {
      presetId: string;
      presetName: string;
      lockLevel: number;
      durationMs: number;
      blocks: unknown[];
    };

    resetSession();
    session.runId = generateRunId();
    session.presetName = payload.presetName;
    session.lockLevel = payload.lockLevel;
    session.durationMs = payload.durationMs;
    session.timeRemainingMs = payload.durationMs;
    session.distractionCount = 0;

    const token = generateToken(payload.lockLevel);
    session.token = token;
    session.tokenHash = token; // In mock, just store plaintext for comparison

    if (payload.lockLevel === 5 || !token) {
      // Level 5: immediate start, no token
      session.phase = "active";
      session.startedAt = Date.now();
      startSessionTimer();

      return {
        token: "",
        snapshot: getSnapshot(),
      };
    }

    // Show token, then countdown
    session.phase = "token-display";
    startTokenCountdown();

    return {
      token,
      snapshot: getSnapshot(),
    };
  },

  session_stop: (args) => {
    const token = args.token as string | null;

    // If session requires token verification
    if (session.lockLevel > 1 && session.phase === "unlock-prompt") {
      if (Date.now() < session.cooldownUntil) {
        throw new Error("Rate limited. Please wait before trying again.");
      }

      if (token !== session.tokenHash) {
        session.unlockAttempts++;
        if (session.unlockAttempts >= 3) {
          session.cooldownUntil = Date.now() + 5 * 60 * 1000;
          session.unlockAttempts = 0;
          throw new Error("Too many failed attempts. Cooldown: 5 minutes.");
        }
        throw new Error("Invalid token.");
      }
    }

    // Stop and create review
    if (session.timerId) clearInterval(session.timerId);
    if (session.tokenTimerId) clearInterval(session.tokenTimerId);
    session.timerId = null;
    session.tokenTimerId = null;

    const elapsed = session.durationMs - session.timeRemainingMs;
    const completionPct = session.durationMs > 0 ? elapsed / session.durationMs : 1;
    const focusScore = Math.max(
      0,
      Math.min(100, Math.round(completionPct * 100 - session.distractionCount * 5)),
    );

    const review = {
      sessionName: session.presetName ?? "Unknown",
      totalDurationMs: session.durationMs,
      actualFocusMs: elapsed,
      distractionCount: session.distractionCount,
      completedNormally: false,
      focusScore,
    };

    session.phase = "completed";
    return review;
  },

  session_request_unlock: () => {
    if (session.phase !== "active") {
      throw new Error("No active session to unlock");
    }
    session.phase = "unlock-prompt";
    return getSnapshot();
  },

  session_cancel_unlock: () => {
    if (session.phase !== "unlock-prompt") {
      throw new Error("Not in unlock prompt");
    }
    session.phase = "active";
    return getSnapshot();
  },

  session_status: () => getSnapshot(),

  session_dismiss: () => {
    resetSession();
  },

  session_record_distraction: () => {
    if (session.phase === "active" || session.phase === "unlock-prompt") {
      session.distractionCount++;
    }
  },

  // Storage commands
  storage_save_session_run: (args) => {
    const payload = args.payload as MockSessionRun;
    sessionRuns.push(payload);

    // Update today stats
    todayStats.focusMinutes += payload.totalFocusMinutes;
    todayStats.sessionsCompleted += payload.completedNormally ? 1 : 0;
    todayStats.distractionsBlocked += payload.distractionCount;
    if (payload.completedNormally) {
      todayStats.currentStreak++;
    }
  },

  storage_get_today_stats: () => todayStats,

  storage_get_recent_sessions: (args) => {
    const limit = (args.limit as number | null) ?? 5;
    return sessionRuns.slice(-limit).reverse();
  },

  storage_get_stats_range: () => [],

  storage_get_streak: () => todayStats.currentStreak,

  // Daemon commands
  daemon_start: () => undefined,
  daemon_stop: () => undefined,
  daemon_status: () => ({
    isRunning: true,
    hostsBlocking: false,
    processBlocking: false,
    activeSession: null,
  }),
  daemon_health_check: () => true,
  daemon_start_blocking: () => undefined,
  daemon_stop_blocking: () => undefined,
  daemon_list_processes: () => [],
  daemon_extension_status: () => ({
    connected: false,
    browserName: null,
    lastSeen: null,
  }),
};

// ---------------------------------------------------------------------------
// Mock invoke
// ---------------------------------------------------------------------------

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const handler = commands[cmd];
  if (!handler) {
    throw new Error(`[TAURI_MOCK] Unknown command: ${cmd}`);
  }
  return handler(args ?? {}) as T;
}

/** Convert a command to an event name (used by Tauri internals) */
export function transformCallback(): number {
  return 0;
}

// Expose mock controls globally for Playwright tests
(window as unknown as Record<string, unknown>).__TAURI_MOCK_SESSION__ = session;
(window as unknown as Record<string, unknown>).__TAURI_MOCK_STATS__ = todayStats;
(window as unknown as Record<string, unknown>).__TAURI_MOCK_RUNS__ = sessionRuns;
(window as unknown as Record<string, unknown>).__TAURI_MOCK_RESET__ = () => {
  resetSession();
  sessionRuns.length = 0;
  todayStats = {
    focusMinutes: 0,
    sessionsCompleted: 0,
    distractionsBlocked: 0,
    currentStreak: 0,
  };
};
