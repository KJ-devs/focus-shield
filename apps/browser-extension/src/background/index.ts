/**
 * Background service worker for Focus Shield browser extension.
 *
 * Manages declarativeNetRequest rules to block distraction domains,
 * tracks blocking state and distraction counts, and responds to
 * messages from the popup and blocked page.
 *
 * Communicates with the desktop daemon via WebSocket for session sync.
 */

import type { DesktopMessage } from "@focus-shield/shared-types";
import {
  connectToDesktop,
  onDesktopMessage,
  reportDistraction,
  reportBlockingConfirmed,
} from "./desktop-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlockingState {
  isActive: boolean;
  sessionId: string | null;
  blockedDomains: string[];
  startedAt: string | null;
  endTime: string | null;
  distractionCount: number;
}

/** Messages the service worker accepts. */
type IncomingMessage =
  | {
      type: "ACTIVATE_BLOCKING";
      domains: string[];
      sessionId: string;
      endTime: string;
    }
  | { type: "DEACTIVATE_BLOCKING" }
  | { type: "GET_STATE" }
  | { type: "GET_DISTRACTION_COUNT" };

const STORAGE_KEY = "focusShield_blockingState";

const DEFAULT_STATE: BlockingState = {
  isActive: false,
  sessionId: null,
  blockedDomains: [],
  startedAt: null,
  endTime: null,
  distractionCount: 0,
};

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

async function getBlockingState(): Promise<BlockingState> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as BlockingState | undefined) ?? DEFAULT_STATE;
}

async function saveBlockingState(state: BlockingState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

// ---------------------------------------------------------------------------
// Rule conversion
// ---------------------------------------------------------------------------

/**
 * The blocked page URL inside the extension's dist output.
 * Vite places HTML entry points under src/<dir>/index.html inside dist/.
 */
function getBlockedPageUrl(): string {
  return chrome.runtime.getURL("dist/src/blocked/index.html");
}

/**
 * Convert a domain pattern (e.g. "*.reddit.com", "youtube.com/shorts/*")
 * into a chrome.declarativeNetRequest.Rule.
 *
 * urlFilter syntax reference:
 *   "||reddit.com"  matches any scheme + any subdomain of reddit.com
 *   "||example.com/path/" matches URLs under that path
 */
function domainPatternToRule(
  pattern: string,
  ruleId: number,
): chrome.declarativeNetRequest.Rule {
  const urlFilter = patternToUrlFilter(pattern);

  return {
    id: ruleId,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: {
        url: getBlockedPageUrl(),
      },
    },
    condition: {
      urlFilter,
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
      ],
    },
  };
}

/**
 * Convert a Focus Shield domain pattern to a declarativeNetRequest urlFilter.
 *
 * Examples:
 *   "*.reddit.com"        -> "||reddit.com"
 *   "reddit.com"          -> "||reddit.com"
 *   "youtube.com/shorts/*" -> "||youtube.com/shorts/"
 *   "*.linkedin.com/feed/*" -> "||linkedin.com/feed/"
 */
function patternToUrlFilter(pattern: string): string {
  let cleaned = pattern.trim().toLowerCase();

  // Strip leading wildcard subdomain prefix
  if (cleaned.startsWith("*.")) {
    cleaned = cleaned.slice(2);
  }

  // Strip trailing wildcard
  if (cleaned.endsWith("/*")) {
    cleaned = cleaned.slice(0, -1); // keep the trailing slash
  } else if (cleaned.endsWith("*")) {
    cleaned = cleaned.slice(0, -1);
  }

  return `||${cleaned}`;
}

// ---------------------------------------------------------------------------
// Blocking activation / deactivation
// ---------------------------------------------------------------------------

/**
 * Activate blocking for the given domains.
 *
 * Generates declarativeNetRequest rules and stores the blocking state.
 */
async function activateBlocking(
  domains: string[],
  sessionId: string,
  endTime: string,
): Promise<void> {
  // First, remove any existing dynamic rules
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingRuleIds = existingRules.map((r) => r.id);

  // Build new rules — IDs start at 1
  const newRules = domains.map((domain, index) =>
    domainPatternToRule(domain, index + 1),
  );

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingRuleIds,
    addRules: newRules,
  });

  const state: BlockingState = {
    isActive: true,
    sessionId,
    blockedDomains: domains,
    startedAt: new Date().toISOString(),
    endTime,
    distractionCount: 0,
  };

  await saveBlockingState(state);

  // Set an alarm to auto-deactivate when the session ends
  const msUntilEnd = new Date(endTime).getTime() - Date.now();
  if (msUntilEnd > 0) {
    await chrome.alarms.create("focusShield_sessionEnd", {
      delayInMinutes: msUntilEnd / 60_000,
    });
  }
}

/**
 * Deactivate all blocking — removes dynamic rules, clears alarms, resets state.
 */
async function deactivateBlocking(): Promise<void> {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingRuleIds = existingRules.map((r) => r.id);

  if (existingRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
    });
  }

  await chrome.alarms.clear("focusShield_sessionEnd");
  await saveBlockingState(DEFAULT_STATE);
}

/**
 * Increment the distraction counter (called when a page redirect is triggered).
 */
async function incrementDistractionCount(): Promise<number> {
  const state = await getBlockingState();
  state.distractionCount += 1;
  await saveBlockingState(state);
  return state.distractionCount;
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

/**
 * Initialise default state on install.
 */
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(STORAGE_KEY);
  if (!existing[STORAGE_KEY]) {
    await saveBlockingState(DEFAULT_STATE);
  }
});

/**
 * Handle messages from popup and blocked page.
 */
chrome.runtime.onMessage.addListener(
  (
    message: IncomingMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ) => {
    // All handlers are async — we need to return true to keep the message port open
    handleMessage(message)
      .then(sendResponse)
      .catch((error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        sendResponse({ error: errorMessage });
      });

    // Return true to indicate we will respond asynchronously
    return true;
  },
);

async function handleMessage(
  message: IncomingMessage,
): Promise<unknown> {
  switch (message.type) {
    case "ACTIVATE_BLOCKING": {
      await activateBlocking(
        message.domains,
        message.sessionId,
        message.endTime,
      );
      return { success: true };
    }

    case "DEACTIVATE_BLOCKING": {
      await deactivateBlocking();
      return { success: true };
    }

    case "GET_STATE": {
      return getBlockingState();
    }

    case "GET_DISTRACTION_COUNT": {
      const state = await getBlockingState();
      return { distractionCount: state.distractionCount };
    }
  }
}

/**
 * Auto-deactivate when the session end alarm fires.
 */
chrome.alarms.onAlarm.addListener(async (alarm: chrome.alarms.Alarm) => {
  if (alarm.name === "focusShield_sessionEnd") {
    await deactivateBlocking();
  }
});

/**
 * Track distraction attempts by listening for redirected navigations.
 *
 * When declarativeNetRequest redirects a main_frame request to the
 * blocked page, the onRuleMatchedDebug event fires (requires
 * "declarativeNetRequestFeedback" permission).
 */
if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async () => {
    await incrementDistractionCount();
    // Report blocked distraction to desktop
    const state = await getBlockingState();
    if (state.isActive && state.blockedDomains.length > 0) {
      reportDistraction(state.blockedDomains[0] ?? "unknown");
    }
  });
}

// ---------------------------------------------------------------------------
// Desktop daemon communication
// ---------------------------------------------------------------------------

/**
 * Handle messages received from the desktop daemon via WebSocket.
 */
onDesktopMessage(async (message: DesktopMessage) => {
  switch (message.type) {
    case "desktop:start_blocking": {
      const endTime =
        message.endTime ?? new Date(Date.now() + 3600_000).toISOString();
      await activateBlocking(message.domains, message.sessionId, endTime);
      // Confirm rules applied
      const rules = await chrome.declarativeNetRequest.getDynamicRules();
      reportBlockingConfirmed(rules.length);
      break;
    }

    case "desktop:stop_blocking": {
      const state = await getBlockingState();
      if (state.sessionId === message.sessionId || state.isActive) {
        await deactivateBlocking();
      }
      break;
    }

    case "desktop:status": {
      // Sync status — if desktop says blocking is active but extension is not,
      // this is a stale state from before extension connected. Desktop will
      // send start_blocking explicitly when needed.
      break;
    }

    case "desktop:welcome": {
      // Connection established. If desktop has an active blocking session,
      // activate blocking directly with the domains from the welcome message.
      if (
        message.activeSessionId &&
        message.blockedDomains &&
        message.blockedDomains.length > 0
      ) {
        const endTime =
          message.endTime ??
          new Date(Date.now() + 3600_000).toISOString();
        await activateBlocking(
          message.blockedDomains,
          message.activeSessionId,
          endTime,
        );
        const rules =
          await chrome.declarativeNetRequest.getDynamicRules();
        reportBlockingConfirmed(rules.length);
      }
      break;
    }

    case "desktop:incognito_warning": {
      console.warn("[Focus Shield]", message.message);
      break;
    }
  }
});

// Connect to desktop daemon on service worker startup
connectToDesktop();

export {};
