// --- Extension ↔ Desktop communication protocol ---
//
// The browser extension communicates with the daemon via WebSocket
// on ws://localhost:7532. Messages are JSON-encoded.

// WebSocket server port for extension communication
export const EXTENSION_WS_PORT = 7532;

// --- Message types: Extension → Desktop ---

export type ExtensionMessageType =
  | "ext:hello"
  | "ext:status_request"
  | "ext:distraction_report"
  | "ext:blocking_confirmed"
  | "ext:incognito_status";

// Extension identifies itself on connect
export interface ExtHelloMessage {
  type: "ext:hello";
  extensionId: string;
  browser: "chrome" | "firefox" | "edge" | "other";
  version: string;
  incognitoAllowed: boolean;
}

// Extension requests current blocking status
export interface ExtStatusRequestMessage {
  type: "ext:status_request";
}

// Extension reports a blocked distraction attempt
export interface ExtDistractionReportMessage {
  type: "ext:distraction_report";
  domain: string;
  timestamp: string;
}

// Extension confirms blocking rules are applied
export interface ExtBlockingConfirmedMessage {
  type: "ext:blocking_confirmed";
  ruleCount: number;
}

// Extension reports incognito access status
export interface ExtIncognitoStatusMessage {
  type: "ext:incognito_status";
  allowed: boolean;
}

export type ExtensionMessage =
  | ExtHelloMessage
  | ExtStatusRequestMessage
  | ExtDistractionReportMessage
  | ExtBlockingConfirmedMessage
  | ExtIncognitoStatusMessage;

// --- Message types: Desktop → Extension ---

export type DesktopMessageType =
  | "desktop:welcome"
  | "desktop:start_blocking"
  | "desktop:stop_blocking"
  | "desktop:status"
  | "desktop:incognito_warning";

// Desktop acknowledges extension connection
export interface DesktopWelcomeMessage {
  type: "desktop:welcome";
  daemonVersion: string;
  activeSessionId: string | null;
  /** Blocked domains if a session is active, so extension can sync immediately. */
  blockedDomains: string[] | null;
  /** Session end time if a session is active. */
  endTime: string | null;
}

// Desktop tells extension to start blocking
export interface DesktopStartBlockingMessage {
  type: "desktop:start_blocking";
  sessionId: string;
  domains: string[];
  endTime: string | null;
}

// Desktop tells extension to stop blocking
export interface DesktopStopBlockingMessage {
  type: "desktop:stop_blocking";
  sessionId: string;
}

// Desktop pushes current status (response to status_request or periodic)
export interface DesktopStatusMessage {
  type: "desktop:status";
  running: boolean;
  activeSessionId: string | null;
  blockedDomainCount: number;
  blockedProcessCount: number;
  uptimeSeconds: number;
}

// Desktop warns about incognito not being enabled
export interface DesktopIncognitoWarningMessage {
  type: "desktop:incognito_warning";
  message: string;
}

export type DesktopMessage =
  | DesktopWelcomeMessage
  | DesktopStartBlockingMessage
  | DesktopStopBlockingMessage
  | DesktopStatusMessage
  | DesktopIncognitoWarningMessage;

// --- Extension connection status ---

export interface ExtensionConnectionInfo {
  extensionId: string;
  browser: string;
  version: string;
  connectedAt: string;
  incognitoAllowed: boolean;
  lastSeen: string;
}

export interface ExtensionStatus {
  connected: boolean;
  connections: ExtensionConnectionInfo[];
}
