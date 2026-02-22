import type { LockLevel, SessionBlockType, RepeatPattern } from "./enums";
import type { BlockRule } from "./blocklist";

export interface Session {
  id: string;
  name: string;
  blocks: SessionBlock[];
  lockLevel: LockLevel;
  blocklist: string; // ID of BlocklistPreset or "custom"
  customBlocklist?: BlockRule[];
  allowlist?: string[];
  repeat?: RepeatConfig;
  autoStart: boolean;
  profileId: string;
  notifications: NotificationConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionBlock {
  type: SessionBlockType;
  duration: number; // minutes
  blockingEnabled: boolean;
  allowedDuringBreak?: string[];
}

export interface RepeatConfig {
  pattern: RepeatPattern;
  days?: number[]; // 0-6, 0 = sunday
  time: string; // "HH:mm"
  autoStart: boolean;
}

export interface NotificationConfig {
  onBlockStart: boolean;
  onBlockEnd: boolean;
  halfwayReminder: boolean;
  onAttemptedDistraction: boolean;
}
