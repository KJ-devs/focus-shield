import type { LockLevel } from "./enums";

export interface Profile {
  id: string;
  name: string;
  icon: string;
  defaultLockLevel: LockLevel;
  defaultBlocklists: string[];
  dailyFocusGoal: number; // minutes
  weeklyFocusGoal: number; // minutes
  createdAt: Date;
}
