import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SchedulePattern = "daily" | "weekdays" | "weekends" | "custom";

export interface ScheduleData {
  id: string;
  sessionPresetId: string;
  presetName: string;
  time: string; // "HH:mm"
  pattern: SchedulePattern;
  days: number[]; // 0-6, 0 = Sunday
  enabled: boolean;
  autoStart: boolean;
}

export interface ScheduleState {
  schedules: ScheduleData[];

  addSchedule: (schedule: Omit<ScheduleData, "id">) => void;
  updateSchedule: (id: string, updates: Partial<Omit<ScheduleData, "id">>) => void;
  deleteSchedule: (id: string) => void;
  toggleSchedule: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "focus-shield-schedules";

const VALID_PATTERNS: SchedulePattern[] = ["daily", "weekdays", "weekends", "custom"];

function isValidSchedule(obj: unknown): obj is ScheduleData {
  if (typeof obj !== "object" || obj === null) return false;
  const record = obj as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.sessionPresetId === "string" &&
    typeof record.presetName === "string" &&
    typeof record.time === "string" &&
    typeof record.pattern === "string" &&
    VALID_PATTERNS.includes(record.pattern as SchedulePattern) &&
    Array.isArray(record.days) &&
    typeof record.enabled === "boolean" &&
    typeof record.autoStart === "boolean"
  );
}

function loadPersistedSchedules(): ScheduleData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const loaded: ScheduleData[] = [];
    for (const item of parsed) {
      if (isValidSchedule(item)) {
        loaded.push({
          ...item,
          days: (item.days as unknown[]).filter(
            (d): d is number => typeof d === "number" && d >= 0 && d <= 6,
          ),
        });
      }
    }

    return loaded;
  } catch {
    return [];
  }
}

function persistSchedules(schedules: ScheduleData[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

function generateId(): string {
  return `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialSchedules = loadPersistedSchedules();

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: initialSchedules,

  addSchedule: (schedule) => {
    const newSchedule: ScheduleData = { ...schedule, id: generateId() };
    const updated = [...get().schedules, newSchedule];
    set({ schedules: updated });
    persistSchedules(updated);
  },

  updateSchedule: (id, updates) => {
    const updated = get().schedules.map((s) =>
      s.id === id ? { ...s, ...updates } : s,
    );
    set({ schedules: updated });
    persistSchedules(updated);
  },

  deleteSchedule: (id) => {
    const updated = get().schedules.filter((s) => s.id !== id);
    set({ schedules: updated });
    persistSchedules(updated);
  },

  toggleSchedule: (id) => {
    const updated = get().schedules.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s,
    );
    set({ schedules: updated });
    persistSchedules(updated);
  },
}));
