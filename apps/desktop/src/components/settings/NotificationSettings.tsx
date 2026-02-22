import { Toggle } from "@/components/ui/Toggle";
import type { NotificationSettings as NotificationSettingsType } from "@/stores/settings-store";

// ---------------------------------------------------------------------------
// Notification row definitions
// ---------------------------------------------------------------------------

interface NotificationRow {
  key: keyof NotificationSettingsType;
  label: string;
  description: string;
}

const NOTIFICATION_ROWS: readonly NotificationRow[] = [
  {
    key: "onBlockStart",
    label: "Block Start",
    description: "Notify when a focus block begins",
  },
  {
    key: "onBlockEnd",
    label: "Block End",
    description: "Notify when a focus block ends",
  },
  {
    key: "halfwayReminder",
    label: "Halfway Reminder",
    description: "Remind at the midpoint of a focus block",
  },
  {
    key: "onAttemptedDistraction",
    label: "Distraction Alert",
    description: "Alert when a distraction is blocked",
  },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface NotificationSettingsProps {
  settings: NotificationSettingsType;
  onChange: (key: keyof NotificationSettingsType, value: boolean) => void;
}

export function NotificationSettings({
  settings,
  onChange,
}: NotificationSettingsProps) {
  return (
    <div className="space-y-4">
      {NOTIFICATION_ROWS.map((row) => (
        <Toggle
          key={row.key}
          checked={settings[row.key]}
          onChange={(checked) => onChange(row.key, checked)}
          label={row.label}
          description={row.description}
        />
      ))}
    </div>
  );
}
