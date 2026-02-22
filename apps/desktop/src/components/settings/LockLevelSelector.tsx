import type { LockLevel } from "@focus-shield/shared-types";

// ---------------------------------------------------------------------------
// Lock level configuration (mirrors session-store TOKEN_CONFIG for settings)
// ---------------------------------------------------------------------------

interface LockLevelInfo {
  readonly level: LockLevel;
  readonly name: string;
  readonly shortDescription: string;
  readonly colorActive: string;
  readonly colorBorder: string;
  readonly colorText: string;
}

const LOCK_LEVELS: readonly LockLevelInfo[] = [
  {
    level: 1,
    name: "Gentle",
    shortDescription: "8 chars, paste allowed",
    colorActive: "bg-green-100 dark:bg-green-900/30",
    colorBorder: "border-green-500",
    colorText: "text-green-700 dark:text-green-400",
  },
  {
    level: 2,
    name: "Moderate",
    shortDescription: "16 chars, no paste",
    colorActive: "bg-yellow-100 dark:bg-yellow-900/30",
    colorBorder: "border-yellow-500",
    colorText: "text-yellow-700 dark:text-yellow-400",
  },
  {
    level: 3,
    name: "Strict",
    shortDescription: "32 chars + 60s cooldown",
    colorActive: "bg-orange-100 dark:bg-orange-900/30",
    colorBorder: "border-orange-500",
    colorText: "text-orange-700 dark:text-orange-400",
  },
  {
    level: 4,
    name: "Hardcore",
    shortDescription: "48 chars + 120s + double entry",
    colorActive: "bg-red-100 dark:bg-red-900/30",
    colorBorder: "border-red-500",
    colorText: "text-red-700 dark:text-red-400",
  },
  {
    level: 5,
    name: "Nuclear",
    shortDescription: "Uninterruptible session",
    colorActive: "bg-purple-100 dark:bg-purple-900/30",
    colorBorder: "border-purple-500",
    colorText: "text-purple-700 dark:text-purple-400",
  },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LockLevelSelectorProps {
  value: LockLevel;
  onChange: (level: LockLevel) => void;
}

export function LockLevelSelector({ value, onChange }: LockLevelSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
      {LOCK_LEVELS.map((info) => {
        const isActive = value === info.level;

        return (
          <button
            key={info.level}
            type="button"
            onClick={() => onChange(info.level)}
            className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-4 text-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-focus-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
              isActive
                ? `${info.colorActive} ${info.colorBorder}`
                : "border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-600"
            }`}
          >
            <span
              className={`text-2xl font-bold ${
                isActive ? info.colorText : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {info.level}
            </span>
            <span
              className={`text-sm font-semibold ${
                isActive ? info.colorText : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {info.name}
            </span>
            <span
              className={`text-xs leading-tight ${
                isActive
                  ? "text-gray-700 dark:text-gray-300"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {info.shortDescription}
            </span>
          </button>
        );
      })}
    </div>
  );
}
