import { create } from "zustand";

interface TodayStats {
  focusMinutes: number;
  sessionsCompleted: number;
  distractionsBlocked: number;
  currentStreak: number;
}

interface SessionState {
  isSessionActive: boolean;
  currentSessionName: string | null;
  timeRemainingMs: number;
  distractionCount: number;
  todayStats: TodayStats;
  startQuickSession: (name: string, durationMs: number) => void;
  stopSession: () => void;
  tick: () => void;
}

const MOCK_TODAY_STATS: TodayStats = {
  focusMinutes: 127,
  sessionsCompleted: 3,
  distractionsBlocked: 15,
  currentStreak: 5,
};

export const useSessionStore = create<SessionState>((set) => ({
  isSessionActive: false,
  currentSessionName: null,
  timeRemainingMs: 0,
  distractionCount: 0,
  todayStats: MOCK_TODAY_STATS,

  startQuickSession: (name: string, durationMs: number) => {
    set({
      isSessionActive: true,
      currentSessionName: name,
      timeRemainingMs: durationMs,
      distractionCount: 0,
    });
  },

  stopSession: () => {
    set({
      isSessionActive: false,
      currentSessionName: null,
      timeRemainingMs: 0,
      distractionCount: 0,
    });
  },

  tick: () => {
    set((state) => {
      if (!state.isSessionActive) return state;
      const next = state.timeRemainingMs - 1000;
      if (next <= 0) {
        return {
          isSessionActive: false,
          currentSessionName: null,
          timeRemainingMs: 0,
          distractionCount: state.distractionCount,
        };
      }
      return { timeRemainingMs: next };
    });
  },
}));
