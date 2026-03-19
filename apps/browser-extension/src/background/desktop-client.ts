/**
 * Desktop communication client for the browser extension.
 *
 * Connects to the Focus Shield daemon via WebSocket on localhost.
 * Handles auto-reconnection when the service worker wakes up.
 */

import type {
  ExtensionMessage,
  DesktopMessage,
} from "@focus-shield/shared-types";

const WS_PORT = 7532;
const WS_URL = `ws://127.0.0.1:${WS_PORT}`;
const RECONNECT_DELAY_MS = 5000;
const ALARM_NAME = "focusShield_desktopReconnect";

let socket: WebSocket | null = null;
let isConnecting = false;

type MessageHandler = (message: DesktopMessage) => void;
const messageHandlers: MessageHandler[] = [];

/**
 * Register a handler for incoming desktop messages.
 */
export function onDesktopMessage(handler: MessageHandler): void {
  messageHandlers.push(handler);
}

/**
 * Send a typed message to the desktop daemon.
 */
export function sendToDesktop(message: ExtensionMessage): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

/**
 * Check if the extension is currently connected to the desktop daemon.
 */
export function isConnected(): boolean {
  return socket !== null && socket.readyState === WebSocket.OPEN;
}

/**
 * Connect to the desktop daemon via WebSocket.
 * Sends a hello message on successful connection.
 */
export async function connectToDesktop(): Promise<void> {
  if (isConnecting || (socket && socket.readyState === WebSocket.OPEN)) {
    return;
  }

  isConnecting = true;

  try {
    socket = new WebSocket(WS_URL);

    socket.onopen = async () => {
      isConnecting = false;

      // Check incognito access
      const incognitoAllowed = await checkIncognitoAccess();

      // Send hello message
      const hello: ExtensionMessage = {
        type: "ext:hello",
        extensionId: chrome.runtime.id,
        browser: detectBrowser(),
        version: chrome.runtime.getManifest().version,
        incognitoAllowed,
      };
      sendToDesktop(hello);

      // Cancel reconnect alarm since we're connected
      await chrome.alarms.clear(ALARM_NAME);
    };

    socket.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string) as DesktopMessage;
        for (const handler of messageHandlers) {
          handler(message);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    socket.onclose = () => {
      socket = null;
      isConnecting = false;
      scheduleReconnect();
    };

    socket.onerror = () => {
      // onclose will fire after this, so we just clean up
      socket?.close();
    };
  } catch {
    isConnecting = false;
    scheduleReconnect();
  }
}

/**
 * Disconnect from the desktop daemon.
 */
export function disconnectFromDesktop(): void {
  if (socket) {
    socket.close();
    socket = null;
  }
}

/**
 * Schedule a reconnection attempt using Chrome alarms.
 * This ensures the service worker wakes up to retry.
 */
async function scheduleReconnect(): Promise<void> {
  await chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: RECONNECT_DELAY_MS / 60_000,
  });
}

/**
 * Check if the extension has incognito access.
 */
async function checkIncognitoAccess(): Promise<boolean> {
  try {
    // chrome.extension.isAllowedIncognitoAccess works in Chrome MV3.
    // Firefox MV3 doesn't support this API, so we catch and return false.
    if (chrome.extension?.isAllowedIncognitoAccess) {
      return await new Promise<boolean>((resolve) => {
        chrome.extension.isAllowedIncognitoAccess((allowed) => {
          resolve(allowed);
        });
      });
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Detect the current browser.
 */
function detectBrowser(): "chrome" | "firefox" | "edge" | "other" {
  const ua = navigator.userAgent;
  if (ua.includes("Edg/")) return "edge";
  if (ua.includes("Firefox/")) return "firefox";
  if (ua.includes("Chrome/")) return "chrome";
  return "other";
}

/**
 * Report a blocked distraction to the desktop daemon.
 */
export function reportDistraction(domain: string): void {
  sendToDesktop({
    type: "ext:distraction_report",
    domain,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Report blocking confirmation to the desktop daemon.
 */
export function reportBlockingConfirmed(ruleCount: number): void {
  sendToDesktop({
    type: "ext:blocking_confirmed",
    ruleCount,
  });
}

// Listen for the reconnect alarm
chrome.alarms.onAlarm.addListener(async (alarm: chrome.alarms.Alarm) => {
  if (alarm.name === ALARM_NAME) {
    await connectToDesktop();
  }
});
