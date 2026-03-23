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
import { useTranslation } from "react-i18next";
import { LANGUAGES, changeLanguage } from "@/i18n";

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
  const { t, i18n } = useTranslation();
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
      <h1 className="mb-6 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
        {t("settings.title")}
      </h1>

      <div className="space-y-6">
        {/* ── Appearance ──────────────────────────────────────────────── */}
        <Card>
          <SectionHeading title={t("settings.appearance")} />
          <Toggle
            checked={theme === "dark"}
            onChange={toggleTheme}
            label="Dark Mode"
            description={`Currently using ${theme} mode`}
          />

          {/* Language */}
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("settings.language")}
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => changeLanguage(lang.code)}
                  className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                    i18n.language === lang.code
                      ? "border-focus-500 bg-focus-50 text-focus-700 dark:border-focus-400 dark:bg-focus-900/20 dark:text-focus-400"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>
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
