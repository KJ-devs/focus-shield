import type { SessionRunStatus, DistractionType, UnlockMethod } from "./enums";

export interface SessionRun {
  id: string;
  sessionId: string;
  profileId: string;
  startedAt: Date;
  endedAt?: Date;
  status: SessionRunStatus;
  currentBlockIndex: number;
  tokenHash: string; // Argon2 hash of the generated token
  distractionAttempts: DistractionAttempt[];
  unlockAttempts: UnlockAttempt[];
  focusScore?: number;
  totalFocusMinutes: number;
  totalBreakMinutes: number;
}

export interface DistractionAttempt {
  timestamp: Date;
  type: DistractionType;
  target: string; // domain or process name
  blocked: boolean;
}

export interface UnlockAttempt {
  timestamp: Date;
  method: UnlockMethod;
  success: boolean;
}
