// --- Session events ---

export interface SessionEvent {
  type: SessionEventType;
  sessionId: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export type SessionEventType =
  | "session:started"
  | "session:paused"
  | "session:resumed"
  | "session:completed"
  | "session:aborted"
  | "session:extended"
  | "block:started"
  | "block:ended"
  | "state:changed"
  | "timer:tick"
  | "score:updated";

// --- Blocker events ---

export interface BlockerEvent {
  type: BlockerEventType;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export type BlockerEventType =
  | "blocker:activated"
  | "blocker:deactivated"
  | "domain:blocked"
  | "domain:allowed"
  | "process:blocked"
  | "process:allowed"
  | "hosts:updated"
  | "hosts:rollback";

// --- Unlock events ---

export interface UnlockEvent {
  type: UnlockEventType;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export type UnlockEventType =
  | "unlock:requested"
  | "unlock:cooldown_started"
  | "unlock:attempt"
  | "unlock:success"
  | "unlock:failed"
  | "unlock:rate_limited"
  | "override:used";
