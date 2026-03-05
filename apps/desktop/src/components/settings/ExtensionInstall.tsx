import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// ---------------------------------------------------------------------------
// Browser detection
// ---------------------------------------------------------------------------

type BrowserId = "chrome" | "firefox" | "edge" | "brave" | "opera" | "safari" | "unknown";

interface BrowserInfo {
  name: string;
  id: BrowserId;
  extensionPageUrl: string;
  storeLabel: string;
  icon: () => React.ReactNode;
}

function getCurrentBrowserId(): BrowserId {
  const ua = navigator.userAgent;
  if (/Edg\//i.test(ua)) return "edge";
  if (/Brave/i.test(ua)) return "brave";
  if (/OPR\//i.test(ua)) return "opera";
  if (/Firefox\//i.test(ua)) return "firefox";
  if (/Chrome\//i.test(ua)) return "chrome";
  if (/Safari\//i.test(ua)) return "safari";
  return "unknown";
}

// Extension pages users need to navigate to manually
const BROWSER_EXTENSION_PAGES: Record<BrowserId, string> = {
  chrome: "chrome://extensions",
  edge: "edge://extensions",
  brave: "brave://extensions",
  opera: "opera://extensions",
  firefox: "about:debugging#/runtime/this-firefox",
  safari: "",
  unknown: "",
};

const ALL_BROWSERS: BrowserInfo[] = [
  { name: "Google Chrome", id: "chrome", extensionPageUrl: BROWSER_EXTENSION_PAGES.chrome, storeLabel: "Chromium — Manifest V3", icon: IconChrome },
  { name: "Firefox", id: "firefox", extensionPageUrl: BROWSER_EXTENSION_PAGES.firefox, storeLabel: "Firefox Add-ons", icon: IconFirefox },
  { name: "Microsoft Edge", id: "edge", extensionPageUrl: BROWSER_EXTENSION_PAGES.edge, storeLabel: "Chromium — Manifest V3", icon: IconEdge },
  { name: "Brave", id: "brave", extensionPageUrl: BROWSER_EXTENSION_PAGES.brave, storeLabel: "Chromium — Manifest V3", icon: IconBrave },
  { name: "Opera", id: "opera", extensionPageUrl: BROWSER_EXTENSION_PAGES.opera, storeLabel: "Chromium — Manifest V3", icon: IconOpera },
];

// The relative path from the project root to the extension folder
const EXTENSION_PATH_CHROME = "apps/browser-extension";
const EXTENSION_PATH_FIREFOX = "apps/browser-extension/dist-firefox";

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

function IconChrome() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#4285F4" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" fill="#4285F4" />
      <path d="M12 8L20 8" stroke="#EA4335" strokeWidth="1.5" />
      <path d="M8 16L4 9" stroke="#34A853" strokeWidth="1.5" />
      <path d="M16 16L8 16" stroke="#FBBC05" strokeWidth="1.5" />
    </svg>
  );
}

function IconFirefox() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#FF7139" strokeWidth="1.5" />
      <path d="M12 6c-3 0-6 3-6 6s3 6 6 6 6-3 6-6" stroke="#FF7139" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="3" fill="#FF7139" />
    </svg>
  );
}

function IconEdge() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#0078D7" strokeWidth="1.5" />
      <path d="M8 15c0-3 2-6 5-6s4 2 4 4" stroke="#0078D7" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="13" r="3" fill="#0078D7" />
    </svg>
  );
}

function IconBrave() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <path d="M12 4L6 8v6l6 6 6-6V8z" stroke="#FB542B" strokeWidth="1.5" fill="none" />
      <path d="M12 8v8M9 11l3 3 3-3" stroke="#FB542B" strokeWidth="1.5" />
    </svg>
  );
}

function IconOpera() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#FF1B2D" strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="4" ry="7" stroke="#FF1B2D" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function IconExtension() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9.5L14.5 2z" />
      <path d="M14 2v6h6" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Extension status check
// ---------------------------------------------------------------------------

type ExtensionConnectionState = "connected" | "disconnected" | "checking";

function useExtensionStatus() {
  const [status, setStatus] = useState<ExtensionConnectionState>("checking");

  const check = useCallback(async () => {
    setStatus("checking");
    try {
      const { daemonExtensionStatus } = await import("@/tauri/daemon");
      const result = await daemonExtensionStatus();
      setStatus(result.connected ? "connected" : "disconnected");
    } catch {
      setStatus("disconnected");
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  return { status, recheck: check };
}

// ---------------------------------------------------------------------------
// Copy to clipboard hook
// ---------------------------------------------------------------------------

function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  return { copied, copy };
}

// ---------------------------------------------------------------------------
// ExtensionInstall component (for Settings page)
// ---------------------------------------------------------------------------

export function ExtensionInstall() {
  const { status, recheck } = useExtensionStatus();
  const currentBrowserId = getCurrentBrowserId();
  const [expandedBrowser, setExpandedBrowser] = useState<BrowserId | null>(null);

  const currentBrowser = ALL_BROWSERS.find((b) => b.id === currentBrowserId);
  const otherBrowsers = ALL_BROWSERS.filter((b) => b.id !== currentBrowserId);

  return (
    <div className="space-y-5">
      {/* Connection status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              status === "connected"
                ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"
                : status === "checking"
                  ? "animate-pulse bg-yellow-400"
                  : "bg-gray-400 dark:bg-gray-600"
            }`}
          />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              Extension Status
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {status === "connected"
                ? "Connected and blocking"
                : status === "checking"
                  ? "Checking connection..."
                  : "Not connected"}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void recheck()}>
          Refresh
        </Button>
      </div>

      {/* Current browser — highlighted */}
      {currentBrowser && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Current Browser
          </p>
          <BrowserInstallCard
            browser={currentBrowser}
            highlighted
            detected
            expanded={expandedBrowser === currentBrowser.id}
            onToggle={() =>
              setExpandedBrowser(
                expandedBrowser === currentBrowser.id ? null : currentBrowser.id,
              )
            }
          />
        </div>
      )}

      {/* Other browsers */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Other Browsers
        </p>
        <div className="space-y-2">
          {otherBrowsers.map((browser) => (
            <BrowserInstallCard
              key={browser.id}
              browser={browser}
              expanded={expandedBrowser === browser.id}
              onToggle={() =>
                setExpandedBrowser(
                  expandedBrowser === browser.id ? null : browser.id,
                )
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BrowserInstallCard
// ---------------------------------------------------------------------------

interface BrowserInstallCardProps {
  browser: BrowserInfo;
  highlighted?: boolean;
  detected?: boolean;
  expanded: boolean;
  onToggle: () => void;
}

function BrowserInstallCard({
  browser,
  highlighted,
  detected,
  expanded,
  onToggle,
}: BrowserInstallCardProps) {
  const Icon = browser.icon;
  const { copied, copy } = useCopyToClipboard();
  const isFirefox = browser.id === "firefox";

  return (
    <div
      className={`overflow-hidden rounded-lg border transition-all duration-200 ${
        highlighted
          ? "border-focus-300 bg-focus-50/50 dark:border-focus-700 dark:bg-focus-900/20"
          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <Icon />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {browser.name}
              </span>
              {detected && <Badge variant="info">Detected</Badge>}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {browser.storeLabel}
            </span>
          </div>
        </div>
        <Button
          variant={highlighted ? "primary" : "secondary"}
          size="sm"
          onClick={onToggle}
        >
          <span className="flex items-center gap-1.5">
            <IconExtension />
            {expanded ? "Hide Steps" : "Install"}
          </span>
        </Button>
      </div>

      {/* Expanded install instructions */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/80">
          <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Installation Steps
          </p>

          <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            {/* Step 1: Open extensions page */}
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-focus-100 text-xs font-bold text-focus-700 dark:bg-focus-900/50 dark:text-focus-300">
                1
              </span>
              <div className="flex-1">
                <p>
                  Open{" "}
                  <code className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs font-semibold text-focus-700 dark:bg-gray-700 dark:text-focus-300">
                    {browser.extensionPageUrl}
                  </code>{" "}
                  in {browser.name}
                </p>
                <button
                  className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  onClick={() => void copy(browser.extensionPageUrl)}
                >
                  {copied ? <IconCheck /> : <IconCopy />}
                  {copied ? "Copied!" : "Copy URL"}
                </button>
              </div>
            </li>

            {/* Step 2: Enable dev mode */}
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-focus-100 text-xs font-bold text-focus-700 dark:bg-focus-900/50 dark:text-focus-300">
                2
              </span>
              <p>
                {isFirefox
                  ? 'Click "Load Temporary Add-on..."'
                  : 'Enable "Developer Mode" (toggle in the top-right corner)'}
              </p>
            </li>

            {/* Step 2.5: Build Firefox version (Firefox only) */}
            {isFirefox && (
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-focus-100 text-xs font-bold text-focus-700 dark:bg-focus-900/50 dark:text-focus-300">
                  3
                </span>
                <div className="flex-1">
                  <p>Build the Firefox version first (run in project root):</p>
                  <CommandCopyBox command="pnpm --filter @focus-shield/browser-extension build:firefox" />
                </div>
              </li>
            )}

            {/* Step 3: Load extension */}
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-focus-100 text-xs font-bold text-focus-700 dark:bg-focus-900/50 dark:text-focus-300">
                {isFirefox ? "4" : "3"}
              </span>
              <div className="flex-1">
                <p>
                  {isFirefox
                    ? "Select the manifest.json file from:"
                    : 'Click "Load unpacked" and select the folder:'}
                </p>
                <ExtensionPathCopyBox isFirefox={isFirefox} />
              </div>
            </li>

            {/* Step 4/5: Verify */}
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700 dark:bg-green-900/50 dark:text-green-300">
                {isFirefox ? "5" : "4"}
              </span>
              <p>
                The Focus Shield icon should appear in your toolbar. Click it to
                start a blocking session!
              </p>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExtensionPathCopyBox — shows the extension path with copy button
// ---------------------------------------------------------------------------

function ExtensionPathCopyBox({ isFirefox }: { isFirefox: boolean }) {
  const { copied, copy } = useCopyToClipboard();
  const displayPath = isFirefox
    ? `${EXTENSION_PATH_FIREFOX}/manifest.json`
    : EXTENSION_PATH_CHROME;

  return (
    <div className="mt-1.5 flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700">
      <code className="flex-1 truncate font-mono text-xs text-gray-800 dark:text-gray-200">
        {displayPath}
      </code>
      <button
        className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-200"
        onClick={() => void copy(displayPath)}
        title="Copy path"
      >
        {copied ? <IconCheck /> : <IconCopy />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CommandCopyBox — shows a terminal command with copy button
// ---------------------------------------------------------------------------

function CommandCopyBox({ command }: { command: string }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="mt-1.5 flex items-center gap-2 rounded-md border border-gray-300 bg-gray-900 px-3 py-2 dark:border-gray-600">
      <span className="select-none text-xs text-gray-500">$</span>
      <code className="flex-1 truncate font-mono text-xs text-green-400">
        {command}
      </code>
      <button
        className="shrink-0 rounded p-1 text-gray-500 transition-colors hover:bg-gray-700 hover:text-gray-200"
        onClick={() => void copy(command)}
        title="Copy command"
      >
        {copied ? <IconCheck /> : <IconCopy />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExtensionBanner — compact banner for HomePage
// ---------------------------------------------------------------------------

export function ExtensionBanner() {
  const { status } = useExtensionStatus();
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (status === "connected" || status === "checking" || dismissed) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 dark:border-amber-800/50 dark:bg-amber-900/20">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
          <svg
            className="h-5 w-5 text-amber-600 dark:text-amber-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Browser extension not connected
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Install the extension to block distracting websites
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate("/settings")}
        >
          <span className="flex items-center gap-1.5">
            <IconExtension />
            Setup
          </span>
        </Button>
        <button
          className="rounded-md p-1 text-amber-400 transition-colors hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/40 dark:hover:text-amber-300"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
