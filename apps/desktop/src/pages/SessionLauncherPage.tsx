import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionStore, TOKEN_CONFIG } from "@/stores/session-store";
import type { SessionConfig } from "@/stores/session-store";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PRESETS, getPresetEmoji, getTotalDurationMinutes } from "@/data/presets";
import type { PresetData } from "@/data/presets";
import type { LockLevel } from "@focus-shield/shared-types";

const LOCK_LEVELS: LockLevel[] = [1, 2, 3, 4, 5];

function formatGroupedToken(token: string): string {
  const groups: string[] = [];
  for (let i = 0; i < token.length; i += 4) {
    groups.push(token.slice(i, i + 4));
  }
  return groups.join("  ");
}

// ---------------------------------------------------------------------------
// Step 1 — Configure session
// ---------------------------------------------------------------------------

function ConfigureStep() {
  const [selectedPreset, setSelectedPreset] = useState<PresetData | null>(null);
  const [lockLevel, setLockLevel] = useState<LockLevel>(2);
  const setConfig = useSessionStore((s) => s.setConfig);
  const generateAndShowToken = useSessionStore((s) => s.generateAndShowToken);

  const handleLaunch = () => {
    if (!selectedPreset) return;

    const totalMinutes = getTotalDurationMinutes(selectedPreset.blocks);
    const config: SessionConfig = {
      presetId: selectedPreset.id,
      presetName: selectedPreset.name,
      lockLevel,
      durationMs: totalMinutes * 60 * 1000,
      blocks: selectedPreset.blocks,
    };

    setConfig(config);
    generateAndShowToken();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Launch Session
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Choose a preset and lock level, then start your focus session.
        </p>
      </div>

      {/* Preset grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Choose a Preset
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRESETS.map((preset) => {
            const isSelected = selectedPreset?.id === preset.id;
            const totalMin = getTotalDurationMinutes(preset.blocks);

            return (
              <button
                key={preset.id}
                type="button"
                data-testid={`preset-${preset.id}`}
                onClick={() => setSelectedPreset(preset)}
                className={`flex flex-col items-start gap-2 rounded-xl border-2 p-5 text-left transition-colors ${
                  isSelected
                    ? "border-focus-500 bg-focus-50 dark:border-focus-400 dark:bg-focus-900/20"
                    : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-2xl">{getPresetEmoji(preset.icon)}</span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {totalMin} min
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {preset.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {preset.description}
                </p>
                {/* Block preview */}
                <div className="mt-1 flex gap-1">
                  {preset.blocks.map((block, idx) => (
                    <div
                      key={`${preset.id}-block-${idx}`}
                      className={`h-2 rounded-full ${
                        block.type === "focus"
                          ? "bg-focus-500"
                          : "bg-green-400 dark:bg-green-600"
                      }`}
                      style={{
                        width: `${Math.max(12, (block.duration / totalMin) * 100)}%`,
                      }}
                      title={`${block.type}: ${block.duration}min`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lock level selector */}
      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
          Lock Level
        </h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          How hard it is to quit the session early
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          {LOCK_LEVELS.map((level) => {
            const config = TOKEN_CONFIG[level];
            const isSelected = lockLevel === level;

            return (
              <button
                key={level}
                type="button"
                data-testid={`lock-level-${level}`}
                onClick={() => setLockLevel(level)}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 p-4 transition-colors ${
                  isSelected
                    ? "border-focus-500 bg-focus-50 dark:border-focus-400 dark:bg-focus-900/20"
                    : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
                }`}
              >
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {level}
                </span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {config.name}
                </span>
                <span className="text-center text-xs text-gray-500 dark:text-gray-400">
                  {config.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Launch button */}
      <div className="flex justify-center pb-8">
        <Button
          variant="primary"
          size="lg"
          disabled={!selectedPreset}
          onClick={handleLaunch}
          className="px-12"
          data-testid="launch-session-btn"
        >
          Launch Session
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Token display
// ---------------------------------------------------------------------------

function TokenDisplayStep() {
  const token = useSessionStore((s) => s.token);
  const tokenCountdown = useSessionStore((s) => s.tokenCountdown);
  const config = useSessionStore((s) => s.config);
  const tokenCountdownTick = useSessionStore((s) => s.tokenCountdownTick);
  const phase = useSessionStore((s) => s.phase);
  const navigate = useNavigate();

  // Tick the countdown
  useEffect(() => {
    if (phase !== "token-display") return;
    const interval = setInterval(tokenCountdownTick, 1000);
    return () => clearInterval(interval);
  }, [phase, tokenCountdownTick]);

  // Navigate to sessions when phase becomes active
  useEffect(() => {
    if (phase === "active") {
      navigate("/sessions");
    }
  }, [phase, navigate]);

  if (!config) return null;

  // Nuclear mode (level 5) — brief message before auto-start
  if (config.lockLevel === 5) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <Card className="flex max-w-md flex-col items-center gap-6 py-10 text-center">
          <span className="text-6xl">{"\u2622\uFE0F"}</span>
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
            Nuclear Mode
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            No turning back. This session cannot be interrupted.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <Card className="flex max-w-xl flex-col items-center gap-6 py-10 text-center">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{"\uD83D\uDD11"}</span>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Your Unlock Code
          </h2>
        </div>

        <div className="rounded-lg bg-yellow-50 px-6 py-3 dark:bg-yellow-900/20">
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
            This is your unlock code. Write it down &mdash; paste is disabled.
          </p>
          <p className="mt-1 text-sm font-medium text-yellow-700 dark:text-yellow-400">
            If you lose it, the session cannot be stopped early. Disappears in{" "}
            <span className="font-bold">{tokenCountdown}</span> seconds.
          </p>
        </div>

        {/* Token display */}
        {token && (
          <div data-testid="token-display" className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-8 py-6 dark:border-gray-600 dark:bg-gray-900">
            <p data-testid="token-value" className="font-mono text-2xl font-bold tracking-widest text-gray-900 dark:text-white">
              {formatGroupedToken(token)}
            </p>
          </div>
        )}

        {/* Countdown ring */}
        <div className="relative flex items-center justify-center">
          <svg width={80} height={80}>
            <circle
              cx={40}
              cy={40}
              r={34}
              fill="none"
              stroke="currentColor"
              strokeWidth={4}
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx={40}
              cy={40}
              r={34}
              fill="none"
              stroke="currentColor"
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 34}
              strokeDashoffset={2 * Math.PI * 34 * (1 - tokenCountdown / 10)}
              className="text-focus-500 transition-[stroke-dashoffset] duration-1000 ease-linear"
              transform="rotate(-90 40 40)"
            />
            <text
              x={40}
              y={40}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-gray-900 dark:fill-white font-mono text-xl font-bold"
              style={{ fontSize: "1.25rem" }}
            >
              {tokenCountdown}
            </text>
          </svg>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Session will start automatically when the countdown ends.
        </p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main launcher page
// ---------------------------------------------------------------------------

export function SessionLauncherPage() {
  const phase = useSessionStore((s) => s.phase);
  const startConfiguring = useSessionStore((s) => s.startConfiguring);
  const navigate = useNavigate();

  // On mount, set phase to configuring if idle
  useEffect(() => {
    if (phase === "idle") {
      startConfiguring();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // If session is already active, redirect
  useEffect(() => {
    if (phase === "active") {
      navigate("/sessions");
    }
  }, [phase, navigate]);

  if (phase === "configuring") {
    return <ConfigureStep />;
  }

  if (phase === "token-display") {
    return <TokenDisplayStep />;
  }

  // Fallback — should not normally be visible
  return null;
}
