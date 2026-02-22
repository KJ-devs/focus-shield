import { Toggle } from "@/components/ui/Toggle";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MorningIntentionProps {
  enabled: boolean;
  intention: string;
  onEnabledChange: (enabled: boolean) => void;
  onIntentionChange: (intention: string) => void;
}

export function MorningIntention({
  enabled,
  intention,
  onEnabledChange,
  onIntentionChange,
}: MorningIntentionProps) {
  return (
    <div className="space-y-4">
      <Toggle
        checked={enabled}
        onChange={onEnabledChange}
        label="Enable Morning Intention"
        description="Show a daily intention prompt when you start your first session"
      />

      {enabled && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Intention Prompt
            </label>
            <input
              type="text"
              value={intention}
              onChange={(e) => onIntentionChange(e.target.value)}
              placeholder="What is your focus goal today?"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-focus-500 focus:outline-none focus:ring-2 focus:ring-focus-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800/50">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Preview
            </p>
            <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-700">
              <p className="text-base font-medium text-gray-900 dark:text-white">
                {intention || "What is your focus goal today?"}
              </p>
              <div className="mt-3 flex gap-2">
                <div className="h-8 flex-1 rounded-md border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800" />
                <div className="h-8 w-16 rounded-md bg-focus-600" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
