// --- Daemon IPC protocol types ---

import type { ProcessAction } from "./enums";

// Daemon command types
export type DaemonCommandType =
  | "start_blocking"
  | "stop_blocking"
  | "get_status"
  | "health_check"
  | "shutdown"
  | "list_processes"
  | "get_extension_status";

// Domain rule sent to daemon for blocking
export interface DaemonDomainRule {
  pattern: string;
}

// Process rule sent to daemon for blocking
export interface DaemonProcessRule {
  name: string;
  aliases: string[];
  action: ProcessAction;
}

// Payload for start_blocking command
export interface StartBlockingPayload {
  sessionId: string;
  domains: DaemonDomainRule[];
  processes: DaemonProcessRule[];
}

// Payload for stop_blocking command
export interface StopBlockingPayload {
  sessionId: string;
}

// Generic daemon request envelope
export interface DaemonRequest {
  id: string;
  command: DaemonCommandType;
  payload?: StartBlockingPayload | StopBlockingPayload;
}

// Daemon error structure
export interface DaemonError {
  code: string;
  message: string;
}

// Daemon status data
export interface DaemonStatusData {
  running: boolean;
  activeSessionId: string | null;
  blockedDomainCount: number;
  blockedProcessCount: number;
  uptimeSeconds: number;
  pid: number;
}

// Generic daemon response envelope
export interface DaemonResponse {
  id: string;
  success: boolean;
  data?: DaemonStatusData;
  error?: DaemonError;
}

// Health check response data
export interface DaemonHealthCheck {
  alive: boolean;
  version: string;
  uptimeSeconds: number;
}

// Process info returned by list_processes command
export interface DaemonProcessInfo {
  pid: number;
  name: string;
}

// Result of a blocking action on a process
export interface ProcessBlockActionResult {
  pid: number;
  name: string;
  action: ProcessAction;
  success: boolean;
  error?: string;
}

// Daemon connection configuration
export interface DaemonConfig {
  pipeName: string; // Windows: \\.\pipe\focus-shield-daemon
  socketPath: string; // Unix: /tmp/focus-shield-daemon.sock
  healthCheckIntervalMs: number;
  reconnectDelayMs: number;
  maxReconnectAttempts: number;
}
