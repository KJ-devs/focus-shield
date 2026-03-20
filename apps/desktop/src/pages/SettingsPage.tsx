import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { LockLevelSelector } from "@/components/settings/LockLevelSelector";
import { MasterKeySetup } from "@/components/settings/MasterKeySetup";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { MorningIntention } from "@/components/settings/MorningIntention";
import { UpdateChecker } from "@/components/settings/UpdateChecker";
import { ExtensionInstall } from "@/components/settings/ExtensionInstall";
import { useThemeStore } from "@/stores/theme-store";
import { useSettingsStore } from "@/stores/settings-store";
import { toastInfo } from "@/stores/notification-store";

// ---------------------------------------------------------------------------
// Section divider helper
// ---------------------------------------------------------------------------

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
      {title}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// Settings Page
// ---------------------------------------------------------------------------

export function SettingsPage() {
  const { theme, toggleTheme } = useThemeStore();

  const {
    lockLevel,
    masterKeyConfigured,
    notifications,
    morningIntention,
    morningIntentionEnabled,
    autoUpdateEnabled,
    crashReportingEnabled,
    setLockLevel,
    setMasterKeyConfigured,
    setNotification,
    setMorningIntention,
    setMorningIntentionEnabled,
    setAutoUpdateEnabled,
    setCrashReportingEnabled,
  } = useSettingsStore();

  const handleExportData = () => {
    // Placeholder -- will be wired to storage export in a future US
    toastInfo("Export feature coming soon. Your data will be available as CSV or JSON.");
  };

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
        Settings
      </h1>

      <div className="space-y-6">
        {/* ── Appearance ──────────────────────────────────────────────── */}
        <Card>
          <SectionHeading title="Appearance" />
          <Toggle
            checked={theme === "dark"}
            onChange={toggleTheme}
            label="Dark Mode"
            description={`Currently using ${theme} mode`}
          />
        </Card>

        {/* ── Browser Extension ──────────────────────────────────────── */}
        <Card>
          <SectionHeading title="Browser Extension" />
          <ExtensionInstall />
        </Card>

        {/* ── Lock Level ──────────────────────────────────────────────── */}
        <Card>
          <SectionHeading title="Lock Level" />
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            How hard it is to quit a session early. Higher levels make it
            harder to stop a focus session impulsively.
          </p>
          <LockLevelSelector value={lockLevel} onChange={setLockLevel} />
        </Card>

        {/* ── Master Key ──────────────────────────────────────────────── */}
        <Card>
          <SectionHeading title="Master Key" />
          <MasterKeySetup
            configured={masterKeyConfigured}
            onConfigured={setMasterKeyConfigured}
          />
        </Card>

        {/* ── Notifications ───────────────────────────────────────────── */}
        <Card>
          <SectionHeading title="Notifications" />
          <NotificationSettings
            settings={notifications}
            onChange={setNotification}
          />
        </Card>

        {/* ── Morning Intention ────────────────────────────────────────── */}
        <Card>
          <SectionHeading title="Morning Intention" />
          <MorningIntention
            enabled={morningIntentionEnabled}
            intention={morningIntention}
            onEnabledChange={setMorningIntentionEnabled}
            onIntentionChange={setMorningIntention}
          />
        </Card>

        {/* ── Updates ─────────────────────────────────────────────────── */}
        <Card>
          <SectionHeading title="Updates" />
          <UpdateChecker
            autoUpdateEnabled={autoUpdateEnabled}
            onAutoUpdateChange={setAutoUpdateEnabled}
          />
        </Card>

        {/* ── Privacy & Telemetry ────────────────────────────────────── */}
        <Card>
          <SectionHeading title="Privacy & Telemetry" />
          <Toggle
            checked={crashReportingEnabled}
            onChange={setCrashReportingEnabled}
            label="Crash Reporting"
            description="Send anonymous crash reports to help improve Focus Shield. Only stack traces, app version, and OS are collected. Disabled by default."
          />
        </Card>

        {/* ── Data ────────────────────────────────────────────────────── */}
        <Card>
          <SectionHeading title="Data" />
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Export your sessions, stats, and configuration as CSV or JSON.
            </p>
            <Button variant="secondary" size="sm" onClick={handleExportData}>
              Export Data
            </Button>
          </div>
        </Card>

        {/* ── About ───────────────────────────────────────────────────── */}
        <Card>
          <SectionHeading title="About" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">
              Focus Shield
            </span>{" "}
            v0.1.0
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Open-source distraction blocker with cryptographic session locking.
          </p>
        </Card>
      </div>
    </div>
  );
}
