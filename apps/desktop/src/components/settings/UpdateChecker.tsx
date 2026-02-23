import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import {
  checkForUpdates,
  installUpdate,
  type UpdateInfo,
} from "@/lib/updater";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const APP_VERSION = "0.1.0";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface UpdateCheckerProps {
  autoUpdateEnabled: boolean;
  onAutoUpdateChange: (enabled: boolean) => void;
}

export function UpdateChecker({
  autoUpdateEnabled,
  onAutoUpdateChange,
}: UpdateCheckerProps) {
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedOnce, setCheckedOnce] = useState(false);

  const handleCheck = useCallback(async () => {
    setChecking(true);
    setError(null);

    try {
      const info = await checkForUpdates();
      setUpdateInfo(info);
      setCheckedOnce(true);
    } catch {
      setError("Failed to check for updates. Please try again later.");
    } finally {
      setChecking(false);
    }
  }, []);

  const handleInstall = useCallback(async () => {
    setInstalling(true);
    setError(null);

    try {
      await installUpdate();
    } catch {
      setError("Failed to install the update. Please try again later.");
    } finally {
      setInstalling(false);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Current version */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            Current Version
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            v{APP_VERSION}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={checking}
          onClick={() => void handleCheck()}
        >
          {checking ? "Checking..." : "Check for Updates"}
        </Button>
      </div>

      {/* Auto-update toggle */}
      <Toggle
        checked={autoUpdateEnabled}
        onChange={onAutoUpdateChange}
        label="Auto-update"
        description="Automatically check for updates on startup and every 4 hours"
      />

      {/* Update available */}
      {updateInfo && (
        <div className="rounded-lg border border-focus-200 bg-focus-50 p-4 dark:border-focus-800 dark:bg-focus-900/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-focus-700 dark:text-focus-300">
                Update Available: v{updateInfo.version}
              </p>
              {updateInfo.date && (
                <p className="mt-0.5 text-xs text-focus-600 dark:text-focus-400">
                  Released: {updateInfo.date}
                </p>
              )}
              {updateInfo.body && (
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  {updateInfo.body}
                </p>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              disabled={installing}
              onClick={() => void handleInstall()}
            >
              {installing ? "Installing..." : "Install Update"}
            </Button>
          </div>
        </div>
      )}

      {/* Already up to date */}
      {checkedOnce && !updateInfo && !error && (
        <p className="text-sm text-green-600 dark:text-green-400">
          You are running the latest version.
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
