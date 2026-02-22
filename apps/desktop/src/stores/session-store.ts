import { create } from "zustand";
import type { LockLevel, SessionBlock } from "@focus-shield/shared-types";

// ---------------------------------------------------------------------------
// Token config (mirrors @focus-shield/crypto TOKEN_CONFIG for browser use)
// ---------------------------------------------------------------------------

const CHARSET_ALPHANUMERIC =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const CHARSET_MIXED =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

const CHARSET_FULL_SYMBOLS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?";

export interface TokenLevelConfig {
  readonly level: LockLevel;
  readonly name: string;
  readonly length: number;
  readonly charset: string;
  readonly pasteAllowed: boolean;
  readonly cooldownBeforeEntry: boolean;
  readonly cooldownMs: number;
  readonly description: string;
}

export const TOKEN_CONFIG: Record<LockLevel, TokenLevelConfig> = {
  1: {
    level: 1,
    name: "Gentle",
    length: 8,
    charset: CHARSET_ALPHANUMERIC,
    pasteAllowed: true,
    cooldownBeforeEntry: false,
    cooldownMs: 0,
    description: "8 alphanumeric characters, paste allowed",
  },
  2: {
    level: 2,
    name: "Moderate",
    length: 16,
    charset: CHARSET_MIXED,
    pasteAllowed: false,
    cooldownBeforeEntry: false,
    cooldownMs: 0,
    description: "16 mixed characters, no paste",
  },
  3: {
    level: 3,
    name: "Strict",
    length: 32,
    charset: CHARSET_FULL_SYMBOLS,
    pasteAllowed: false,
    cooldownBeforeEntry: true,
    cooldownMs: 60_000,
    description: "32 mixed + symbols, 60s cooldown before entry",
  },
  4: {
    level: 4,
    name: "Hardcore",
    length: 48,
    charset: CHARSET_FULL_SYMBOLS,
    pasteAllowed: false,
    cooldownBeforeEntry: true,
    cooldownMs: 120_000,
    description: "48 mixed + symbols, 120s cooldown, double entry required",
  },
  5: {
    level: 5,
    name: "Nuclear",
    length: 0,
    charset: "",
    pasteAllowed: false,
    cooldownBeforeEntry: false,
    cooldownMs: 0,
    description: "No token — session is uninterruptible",
  },
};

/**
 * Browser-safe token generator using Web Crypto API.
 */
function generateTokenBrowser(level: LockLevel): string {
  const config = TOKEN_CONFIG[level];

  if (config.length === 0 || config.charset.length === 0) {
    return "";
  }

  const charsetLength = config.charset.length;
  const maxAcceptable = Math.floor(256 / charsetLength) * charsetLength;
  const chars: string[] = [];

  while (chars.length < config.length) {
    const randomArray = new Uint8Array(config.length * 2);
    crypto.getRandomValues(randomArray);

    for (let j = 0; j < randomArray.length && chars.length < config.length; j++) {
      const byte = randomArray[j];
      if (byte === undefined || byte >= maxAcceptable) {
        continue;
      }
      const char = config.charset[byte % charsetLength];
      if (char !== undefined) {
        chars.push(char);
      }
    }
  }

  return chars.join("");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export interface SessionReview {
  sessionName: string;
  totalDurationMs: number;
  actualFocusMs: number;
  distractionCount: number;
  completedNormally: boolean;
  focusScore: number;
}

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
  tokenCountdown: number;
  timeRemainingMs: number;
  currentBlockIndex: number;
  distractionCount: number;
  startedAt: number | null;
  todayStats: TodayStats;
  review: SessionReview | null;

  // Derived getter kept for HomePage backward compat
  isSessionActive: boolean;
  currentSessionName: string | null;

  // Actions
  startConfiguring: () => void;
  setConfig: (config: SessionConfig) => void;
  generateAndShowToken: () => void;
  tokenCountdownTick: () => void;
  startSession: () => void;
  tick: () => void;
  requestUnlock: () => void;
  cancelUnlock: () => void;
  completeSession: () => void;
  forceStop: (wasUnlocked: boolean) => void;
  dismissReview: () => void;
  startQuickSession: (name: string, durationMs: number) => void;
  stopSession: () => void;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_TODAY_STATS: TodayStats = {
  focusMinutes: 127,
  sessionsCompleted: 3,
  distractionsBlocked: 15,
  currentStreak: 5,
};

const TOKEN_DISPLAY_SECONDS = 10;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSessionStore = create<SessionState>((set, get) => ({
  phase: "idle",
  config: null,
  token: null,
  tokenCountdown: 0,
  timeRemainingMs: 0,
  currentBlockIndex: 0,
  distractionCount: 0,
  startedAt: null,
  todayStats: MOCK_TODAY_STATS,
  review: null,

  // Backward compatibility
  isSessionActive: false,
  currentSessionName: null,

  startConfiguring: () => {
    set({
      phase: "configuring",
      config: null,
      token: null,
      tokenCountdown: 0,
      review: null,
    });
  },

  setConfig: (config: SessionConfig) => {
    set({ config });
  },

  generateAndShowToken: () => {
    const { config } = get();
    if (!config) return;

    // Level 5 (Nuclear) — skip token display, go straight to active
    if (config.lockLevel === 5) {
      set({
        phase: "active",
        token: null,
        tokenCountdown: 0,
        timeRemainingMs: config.durationMs,
        currentBlockIndex: 0,
        distractionCount: 0,
        startedAt: Date.now(),
        isSessionActive: true,
        currentSessionName: config.presetName,
      });
      return;
    }

    const newToken = generateTokenBrowser(config.lockLevel);
    set({
      phase: "token-display",
      token: newToken,
      tokenCountdown: TOKEN_DISPLAY_SECONDS,
    });
  },

  tokenCountdownTick: () => {
    const state = get();
    if (state.phase !== "token-display") return;

    const next = state.tokenCountdown - 1;
    if (next <= 0) {
      // Auto-start session, clear plaintext token
      const config = state.config;
      if (!config) return;

      set({
        phase: "active",
        token: null,
        tokenCountdown: 0,
        timeRemainingMs: config.durationMs,
        currentBlockIndex: 0,
        distractionCount: 0,
        startedAt: Date.now(),
        isSessionActive: true,
        currentSessionName: config.presetName,
      });
    } else {
      set({ tokenCountdown: next });
    }
  },

  startSession: () => {
    const { config } = get();
    if (!config) return;

    set({
      phase: "active",
      token: null,
      tokenCountdown: 0,
      timeRemainingMs: config.durationMs,
      currentBlockIndex: 0,
      distractionCount: 0,
      startedAt: Date.now(),
      isSessionActive: true,
      currentSessionName: config.presetName,
    });
  },

  tick: () => {
    set((state) => {
      if (state.phase !== "active" && state.phase !== "unlock-prompt") {
        return state;
      }

      const next = state.timeRemainingMs - 1000;
      if (next <= 0) {
        // Session completed normally
        const totalDurationMs = state.config?.durationMs ?? 0;
        const actualFocusMs = totalDurationMs;
        const focusScore = Math.max(
          0,
          Math.min(100, 100 - state.distractionCount * 5),
        );

        return {
          phase: "review" as const,
          timeRemainingMs: 0,
          isSessionActive: false,
          currentSessionName: null,
          review: {
            sessionName: state.config?.presetName ?? "Session",
            totalDurationMs,
            actualFocusMs,
            distractionCount: state.distractionCount,
            completedNormally: true,
            focusScore,
          },
        };
      }

      // Advance block index if needed
      let newBlockIndex = state.currentBlockIndex;
      if (state.config) {
        const elapsed = (state.config.durationMs - next) / 1000 / 60; // minutes elapsed
        let accum = 0;
        for (let i = 0; i < state.config.blocks.length; i++) {
          accum += state.config.blocks[i]?.duration ?? 0;
          if (elapsed < accum) {
            newBlockIndex = i;
            break;
          }
        }
      }

      return {
        timeRemainingMs: next,
        currentBlockIndex: newBlockIndex,
      };
    });
  },

  requestUnlock: () => {
    const { phase } = get();
    if (phase !== "active") return;
    set({ phase: "unlock-prompt" });
  },

  cancelUnlock: () => {
    const { phase } = get();
    if (phase !== "unlock-prompt") return;
    set({ phase: "active" });
  },

  completeSession: () => {
    const state = get();
    const totalDurationMs = state.config?.durationMs ?? 0;
    const elapsed = state.startedAt ? Date.now() - state.startedAt : totalDurationMs;
    const focusScore = Math.max(
      0,
      Math.min(100, 100 - state.distractionCount * 5),
    );

    set({
      phase: "review",
      timeRemainingMs: 0,
      isSessionActive: false,
      currentSessionName: null,
      review: {
        sessionName: state.config?.presetName ?? "Session",
        totalDurationMs,
        actualFocusMs: Math.min(elapsed, totalDurationMs),
        distractionCount: state.distractionCount,
        completedNormally: true,
        focusScore,
      },
    });
  },

  forceStop: (_wasUnlocked: boolean) => {
    const state = get();
    const totalDurationMs = state.config?.durationMs ?? 0;
    const elapsed = state.startedAt ? Date.now() - state.startedAt : 0;
    const focusScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(((elapsed / Math.max(totalDurationMs, 1)) * 80) - state.distractionCount * 5),
      ),
    );

    set({
      phase: "review",
      timeRemainingMs: 0,
      isSessionActive: false,
      currentSessionName: null,
      review: {
        sessionName: state.config?.presetName ?? "Session",
        totalDurationMs,
        actualFocusMs: elapsed,
        distractionCount: state.distractionCount,
        completedNormally: false,
        focusScore: Math.max(0, focusScore),
      },
    });
  },

  dismissReview: () => {
    set({
      phase: "idle",
      config: null,
      token: null,
      tokenCountdown: 0,
      timeRemainingMs: 0,
      currentBlockIndex: 0,
      distractionCount: 0,
      startedAt: null,
      review: null,
      isSessionActive: false,
      currentSessionName: null,
    });
  },

  startQuickSession: (name: string, durationMs: number) => {
    set({
      phase: "active",
      config: {
        presetId: "quick",
        presetName: name,
        lockLevel: 1,
        durationMs,
        blocks: [{ type: "focus", duration: durationMs / 60000, blockingEnabled: true }],
      },
      token: null,
      tokenCountdown: 0,
      timeRemainingMs: durationMs,
      currentBlockIndex: 0,
      distractionCount: 0,
      startedAt: Date.now(),
      isSessionActive: true,
      currentSessionName: name,
      review: null,
    });
  },

  stopSession: () => {
    const state = get();
    if (state.config && state.config.lockLevel > 1) {
      set({ phase: "unlock-prompt" });
      return;
    }

    // For lock level 1 or quick sessions, stop immediately
    const totalDurationMs = state.config?.durationMs ?? 0;
    const elapsed = state.startedAt ? Date.now() - state.startedAt : 0;

    set({
      phase: "review",
      timeRemainingMs: 0,
      isSessionActive: false,
      currentSessionName: null,
      review: {
        sessionName: state.config?.presetName ?? "Session",
        totalDurationMs,
        actualFocusMs: elapsed,
        distractionCount: state.distractionCount,
        completedNormally: false,
        focusScore: Math.max(
          0,
          Math.round(((elapsed / Math.max(totalDurationMs, 1)) * 80) - state.distractionCount * 5),
        ),
      },
    });
  },
}));
