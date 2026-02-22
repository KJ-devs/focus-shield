import { create } from "zustand";
import type { LockLevel } from "@focus-shield/shared-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProfileData {
  id: string;
  name: string;
  icon: string;
  defaultLockLevel: LockLevel;
  dailyFocusGoal: number; // minutes
}

export interface ProfileState {
  profiles: ProfileData[];
  activeProfileId: string;

  addProfile: (profile: Omit<ProfileData, "id">) => void;
  updateProfile: (id: string, updates: Partial<Omit<ProfileData, "id">>) => void;
  deleteProfile: (id: string) => void;
  setActiveProfile: (id: string) => void;
  getActiveProfile: () => ProfileData;
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "focus-shield-profiles";

const DEFAULT_PROFILE: ProfileData = {
  id: "default-work",
  name: "Work",
  icon: "briefcase",
  defaultLockLevel: 2,
  dailyFocusGoal: 240,
};

function isValidLockLevel(value: unknown): value is LockLevel {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

function isValidProfile(obj: unknown): obj is ProfileData {
  if (typeof obj !== "object" || obj === null) return false;
  const record = obj as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.icon === "string" &&
    isValidLockLevel(record.defaultLockLevel) &&
    typeof record.dailyFocusGoal === "number"
  );
}

interface PersistedProfiles {
  profiles: ProfileData[];
  activeProfileId: string;
}

function loadPersistedProfiles(): PersistedProfiles {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { profiles: [DEFAULT_PROFILE], activeProfileId: DEFAULT_PROFILE.id };

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return { profiles: [DEFAULT_PROFILE], activeProfileId: DEFAULT_PROFILE.id };
    }

    const obj = parsed as Record<string, unknown>;
    const profiles: ProfileData[] = [];

    if (Array.isArray(obj.profiles)) {
      for (const item of obj.profiles) {
        if (isValidProfile(item)) {
          profiles.push(item);
        }
      }
    }

    if (profiles.length === 0) {
      profiles.push(DEFAULT_PROFILE);
    }

    const activeProfileId =
      typeof obj.activeProfileId === "string" &&
      profiles.some((p) => p.id === obj.activeProfileId)
        ? obj.activeProfileId
        : profiles[0]?.id ?? DEFAULT_PROFILE.id;

    return { profiles, activeProfileId };
  } catch {
    return { profiles: [DEFAULT_PROFILE], activeProfileId: DEFAULT_PROFILE.id };
  }
}

function persistProfiles(profiles: ProfileData[], activeProfileId: string): void {
  const data: PersistedProfiles = { profiles, activeProfileId };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function generateId(): string {
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const persisted = loadPersistedProfiles();

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: persisted.profiles,
  activeProfileId: persisted.activeProfileId,

  addProfile: (profile) => {
    const newProfile: ProfileData = { ...profile, id: generateId() };
    const updated = [...get().profiles, newProfile];
    set({ profiles: updated });
    persistProfiles(updated, get().activeProfileId);
  },

  updateProfile: (id, updates) => {
    const updated = get().profiles.map((p) =>
      p.id === id ? { ...p, ...updates } : p,
    );
    set({ profiles: updated });
    persistProfiles(updated, get().activeProfileId);
  },

  deleteProfile: (id) => {
    const current = get();
    // Cannot delete the last profile
    if (current.profiles.length <= 1) return;

    const updated = current.profiles.filter((p) => p.id !== id);
    let { activeProfileId } = current;

    // If we deleted the active profile, switch to first available
    if (activeProfileId === id) {
      activeProfileId = updated[0]?.id ?? "";
    }

    set({ profiles: updated, activeProfileId });
    persistProfiles(updated, activeProfileId);
  },

  setActiveProfile: (id) => {
    const exists = get().profiles.some((p) => p.id === id);
    if (!exists) return;
    set({ activeProfileId: id });
    persistProfiles(get().profiles, id);
  },

  getActiveProfile: () => {
    const state = get();
    const active = state.profiles.find((p) => p.id === state.activeProfileId);
    return active ?? state.profiles[0] ?? DEFAULT_PROFILE;
  },
}));
