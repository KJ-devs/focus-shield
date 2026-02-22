import { create } from "zustand";
import type { LockLevel } from "@focus-shield/shared-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationSettings {
  onBlockStart: boolean;
  onBlockEnd: boolean;
  halfwayReminder: boolean;
  onAttemptedDistraction: boolean;
}

export interface SettingsState {
  lockLevel: LockLevel;
  masterKeyConfigured: boolean;
  notifications: NotificationSettings;
  morningIntention: string;
  morningIntentionEnabled: boolean;

  setLockLevel: (level: LockLevel) => void;
  setMasterKeyConfigured: (configured: boolean) => void;
  setNotification: (key: keyof NotificationSettings, value: boolean) => void;
  setMorningIntention: (intention: string) => void;
  setMorningIntentionEnabled: (enabled: boolean) => void;
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "focus-shield-settings";

interface PersistedSettings {
  lockLevel: LockLevel;
  masterKeyConfigured: boolean;
  notifications: NotificationSettings;
  morningIntention: string;
  morningIntentionEnabled: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  onBlockStart: true,
  onBlockEnd: true,
  halfwayReminder: false,
  onAttemptedDistraction: true,
};

const DEFAULT_MORNING_INTENTION = "What is your focus goal today?";

function isValidLockLevel(value: unknown): value is LockLevel {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

function loadPersistedSettings(): Partial<PersistedSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};

    const obj = parsed as Record<string, unknown>;
    const result: Partial<PersistedSettings> = {};

    if (isValidLockLevel(obj.lockLevel)) {
      result.lockLevel = obj.lockLevel;
    }

    if (typeof obj.masterKeyConfigured === "boolean") {
      result.masterKeyConfigured = obj.masterKeyConfigured;
    }

    if (typeof obj.morningIntention === "string") {
      result.morningIntention = obj.morningIntention;
    }

    if (typeof obj.morningIntentionEnabled === "boolean") {
      result.morningIntentionEnabled = obj.morningIntentionEnabled;
    }

    if (typeof obj.notifications === "object" && obj.notifications !== null) {
      const notif = obj.notifications as Record<string, unknown>;
      result.notifications = {
        onBlockStart:
          typeof notif.onBlockStart === "boolean"
            ? notif.onBlockStart
            : DEFAULT_NOTIFICATIONS.onBlockStart,
        onBlockEnd:
          typeof notif.onBlockEnd === "boolean"
            ? notif.onBlockEnd
            : DEFAULT_NOTIFICATIONS.onBlockEnd,
        halfwayReminder:
          typeof notif.halfwayReminder === "boolean"
            ? notif.halfwayReminder
            : DEFAULT_NOTIFICATIONS.halfwayReminder,
        onAttemptedDistraction:
          typeof notif.onAttemptedDistraction === "boolean"
            ? notif.onAttemptedDistraction
            : DEFAULT_NOTIFICATIONS.onAttemptedDistraction,
      };
    }

    return result;
  } catch {
    return {};
  }
}

function persistSettings(state: PersistedSettings): void {
  const data: PersistedSettings = {
    lockLevel: state.lockLevel,
    masterKeyConfigured: state.masterKeyConfigured,
    notifications: state.notifications,
    morningIntention: state.morningIntention,
    morningIntentionEnabled: state.morningIntentionEnabled,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const persisted = loadPersistedSettings();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  lockLevel: persisted.lockLevel ?? 2,
  masterKeyConfigured: persisted.masterKeyConfigured ?? false,
  notifications: persisted.notifications ?? { ...DEFAULT_NOTIFICATIONS },
  morningIntention: persisted.morningIntention ?? DEFAULT_MORNING_INTENTION,
  morningIntentionEnabled: persisted.morningIntentionEnabled ?? false,

  setLockLevel: (level: LockLevel) => {
    set({ lockLevel: level });
    persistSettings({ ...get(), lockLevel: level });
  },

  setMasterKeyConfigured: (configured: boolean) => {
    set({ masterKeyConfigured: configured });
    persistSettings({ ...get(), masterKeyConfigured: configured });
  },

  setNotification: (key: keyof NotificationSettings, value: boolean) => {
    const updated = { ...get().notifications, [key]: value };
    set({ notifications: updated });
    persistSettings({ ...get(), notifications: updated });
  },

  setMorningIntention: (intention: string) => {
    set({ morningIntention: intention });
    persistSettings({ ...get(), morningIntention: intention });
  },

  setMorningIntentionEnabled: (enabled: boolean) => {
    set({ morningIntentionEnabled: enabled });
    persistSettings({ ...get(), morningIntentionEnabled: enabled });
  },
}));
