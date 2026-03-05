import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// ---------------------------------------------------------------------------
// Browser detection
// ---------------------------------------------------------------------------

interface DetectedBrowser {
  name: string;
  id: "chrome" | "firefox" | "edge" | "brave" | "opera" | "safari" | "unknown";
  installUrl: string;
  icon: () => React.ReactNode;
}

function detectBrowsers(): DetectedBrowser[] {
  const ua = navigator.userAgent;
  const browsers: DetectedBrowser[] = [];

  // Order matters: check more specific browsers first (they include Chrome in UA)
  if (/Edg\//i.test(ua)) {
    browsers.push({
      name: "Microsoft Edge",
      id: "edge",
      installUrl: "#edge-addons",
      icon: IconEdge,
    });
  }
  if (/Brave/i.test(ua)) {
    browsers.push({
      name: "Brave",
      id: "brave",
      installUrl: "#chrome-store",
      icon: IconBrave,
    });
  }
  if (/OPR\//i.test(ua)) {
    browsers.push({
      name: "Opera",
      id: "opera",
      installUrl: "#chrome-store",
      icon: IconOpera,
    });
  }
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua) && !/OPR\//i.test(ua) && !/Brave/i.test(ua)) {
    browsers.push({
      name: "Google Chrome",
      id: "chrome",
      installUrl: "#chrome-store",
      icon: IconChrome,
    });
  }
  if (/Firefox\//i.test(ua)) {
    browsers.push({
      name: "Firefox",
      id: "firefox",
      installUrl: "#firefox-addons",
      icon: IconFirefox,
    });
  }
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browsers.push({
      name: "Safari",
      id: "safari",
      installUrl: "",
      icon: IconSafari,
    });
  }

  return browsers;
}

function getCurrentBrowserId(): DetectedBrowser["id"] {
  const ua = navigator.userAgent;
  if (/Edg\//i.test(ua)) return "edge";
  if (/Brave/i.test(ua)) return "brave";
  if (/OPR\//i.test(ua)) return "opera";
  if (/Firefox\//i.test(ua)) return "firefox";
  if (/Chrome\//i.test(ua)) return "chrome";
  if (/Safari\//i.test(ua)) return "safari";
  return "unknown";
}

// ---------------------------------------------------------------------------
// All supported browsers (for settings page full list)
// ---------------------------------------------------------------------------

const ALL_BROWSERS: DetectedBrowser[] = [
  { name: "Google Chrome", id: "chrome", installUrl: "#chrome-store", icon: IconChrome },
  { name: "Firefox", id: "firefox", installUrl: "#firefox-addons", icon: IconFirefox },
  { name: "Microsoft Edge", id: "edge", installUrl: "#edge-addons", icon: IconEdge },
  { name: "Brave", id: "brave", installUrl: "#chrome-store", icon: IconBrave },
  { name: "Opera", id: "opera", installUrl: "#chrome-store", icon: IconOpera },
];

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

function IconSafari() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#006CFF" strokeWidth="1.5" />
      <path d="M12 12L16 7M12 12L8 17" stroke="#006CFF" strokeWidth="1.5" />
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

// ---------------------------------------------------------------------------
// Extension status check
// ---------------------------------------------------------------------------

type ExtensionConnectionState = "connected" | "disconnected" | "checking";

function useExtensionStatus() {
  const [status, setStatus] = useState<ExtensionConnectionState>("checking");

  const check = useCallback(async () => {
    setStatus("checking");
    try {
      // Try to import and call the daemon status check
      // In dev mode (Vite without Tauri), this will fail — that's expected
      const { daemonExtensionStatus } = await import("@/tauri/daemon");
      const result = await daemonExtensionStatus();
      setStatus(result.connected ? "connected" : "disconnected");
    } catch {
      // Not running in Tauri context — assume disconnected
      setStatus("disconnected");
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  return { status, recheck: check };
}

// ---------------------------------------------------------------------------
// ExtensionInstall component (for Settings page)
// ---------------------------------------------------------------------------

export function ExtensionInstall() {
  const { status, recheck } = useExtensionStatus();
  const currentBrowserId = getCurrentBrowserId();
  const detectedBrowsers = detectBrowsers();

  // Show detected browser first, then all others
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
          <BrowserInstallCard browser={currentBrowser} highlighted detected />
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
              detected={detectedBrowsers.some((d) => d.id === browser.id)}
            />
          ))}
        </div>
      </div>

      {/* Manual install instructions */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Manual Installation (Developer Mode)
        </p>
        <ol className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
          <li>1. Open your browser&apos;s extension page</li>
          <li>2. Enable &quot;Developer Mode&quot;</li>
          <li>3. Click &quot;Load unpacked extension&quot;</li>
          <li>
            4. Select:{" "}
            <code className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-700">
              apps/browser-extension
            </code>
          </li>
        </ol>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BrowserInstallCard
// ---------------------------------------------------------------------------

interface BrowserInstallCardProps {
  browser: DetectedBrowser;
  highlighted?: boolean;
  detected?: boolean;
}

function BrowserInstallCard({ browser, highlighted, detected }: BrowserInstallCardProps) {
  const Icon = browser.icon;
  const isChromium = browser.id === "chrome" || browser.id === "edge" || browser.id === "brave" || browser.id === "opera";

  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-3 transition-all duration-200 ${
        highlighted
          ? "border-focus-300 bg-focus-50/50 dark:border-focus-700 dark:bg-focus-900/20"
          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {browser.name}
            </span>
            {detected && (
              <Badge variant="info">Detected</Badge>
            )}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {isChromium ? "Manifest V3 — Chrome Web Store" : "Firefox Add-ons"}
          </span>
        </div>
      </div>
      {browser.installUrl ? (
        <Button
          variant={highlighted ? "primary" : "secondary"}
          size="sm"
          onClick={() => window.open(browser.installUrl, "_blank")}
        >
          <span className="flex items-center gap-1.5">
            <IconExtension />
            Install
          </span>
        </Button>
      ) : (
        <span className="text-xs text-gray-400">Not supported</span>
      )}
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
          <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
