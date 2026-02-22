import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useThemeStore } from "@/stores/theme-store";

export function SettingsPage() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
        Settings
      </h1>

      <div className="space-y-6">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Theme
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Currently using {theme} mode
              </p>
            </div>
            <Button variant="secondary" onClick={toggleTheme}>
              {theme === "light"
                ? "\uD83C\uDF19 Switch to Dark"
                : "\u2600\uFE0F Switch to Light"}
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col items-center gap-4 py-12">
          <span className="text-4xl">{"\u2699\uFE0F"}</span>
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
            More settings &mdash; Coming soon
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Lock levels, master key, notifications, and more.
          </p>
        </Card>
      </div>
    </div>
  );
}
