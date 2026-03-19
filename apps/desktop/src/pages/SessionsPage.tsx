import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "@/stores/session-store";
import { useScheduleStore } from "@/stores/schedule-store";
import type { SchedulePattern } from "@/stores/schedule-store";
import { CircularTimer } from "@/components/session/CircularTimer";
import { PasswordInput } from "@/components/session/PasswordInput";
import { SessionReview } from "@/components/session/SessionReview";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { PRESETS, getPresetEmoji } from "@/data/presets";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const PATTERN_LABELS: Record<SchedulePattern, string> = {
  daily: "Every day",
  weekdays: "Weekdays",
  weekends: "Weekends",
  custom: "Custom days",
};

function getDaysForPattern(pattern: SchedulePattern): number[] {
  switch (pattern) {
    case "daily":
      return [0, 1, 2, 3, 4, 5, 6];
    case "weekdays":
      return [1, 2, 3, 4, 5];
    case "weekends":
      return [0, 6];
    case "custom":
      return [];
  }
}

function formatScheduleDays(pattern: SchedulePattern, days: number[]): string {
  if (pattern !== "custom") return PATTERN_LABELS[pattern];
  if (days.length === 0) return "No days selected";
  return days.map((d) => DAY_LABELS[d]).join(", ");
}

// ---------------------------------------------------------------------------
// Block progression bar
// ---------------------------------------------------------------------------

function BlockProgression() {
  const config = useSessionStore((s) => s.config);
  const currentBlockIndex = useSessionStore((s) => s.currentBlockIndex);

  if (!config || config.blocks.length === 0) return null;

  const totalMinutes = config.blocks.reduce((sum, b) => sum + b.duration, 0);

  return (
    <div className="w-full max-w-md">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Block {currentBlockIndex + 1} of {config.blocks.length}
        </span>
        <span className="text-sm text-gray-400 dark:text-gray-500">
          {config.blocks[currentBlockIndex]?.type === "focus" ? "Focus" : "Break"}
        </span>
      </div>
      <div className="flex gap-1 rounded-full bg-gray-100 p-1 dark:bg-gray-800">
        {config.blocks.map((block, idx) => {
          const widthPct = (block.duration / totalMinutes) * 100;
          const isCurrent = idx === currentBlockIndex;
          const isPast = idx < currentBlockIndex;

          let colorClass: string;
          if (block.type === "focus") {
            colorClass = isCurrent
              ? "bg-focus-500"
              : isPast
                ? "bg-focus-300 dark:bg-focus-700"
                : "bg-gray-300 dark:bg-gray-600";
          } else {
            colorClass = isCurrent
              ? "bg-green-500"
              : isPast
                ? "bg-green-300 dark:bg-green-700"
                : "bg-gray-300 dark:bg-gray-600";
          }

          return (
            <div
              key={`block-${idx}`}
              className={`h-3 rounded-full transition-colors ${colorClass}`}
              style={{ width: `${Math.max(4, widthPct)}%` }}
              title={`${block.type}: ${block.duration}min`}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active session view
// ---------------------------------------------------------------------------

function ActiveSessionView() {
  const timeRemainingMs = useSessionStore((s) => s.timeRemainingMs);
  const config = useSessionStore((s) => s.config);
  const distractionCount = useSessionStore((s) => s.distractionCount);
  const startedAt = useSessionStore((s) => s.startedAt);
  const requestUnlock = useSessionStore((s) => s.requestUnlock);

  const totalDurationMs = config?.durationMs ?? 0;
  const sessionName = config?.presetName ?? "Session";

  const elapsedMs = startedAt ? Date.now() - startedAt : 0;
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);

  return (
    <div className="flex flex-col items-center gap-8">
      <Badge variant="success">
        <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
        Session Active
      </Badge>

      <CircularTimer
        timeRemainingMs={timeRemainingMs}
        totalDurationMs={totalDurationMs}
        sessionName={sessionName}
      />

      <BlockProgression />

      {/* Stats row */}
      <div className="flex gap-6">
        <div className="flex flex-col items-center rounded-xl bg-white px-6 py-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
          <span className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Distractions
          </span>
          <span className="text-2xl font-bold text-red-500 dark:text-red-400">
            {distractionCount}
          </span>
        </div>
        <div className="flex flex-col items-center rounded-xl bg-white px-6 py-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
          <span className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Elapsed
          </span>
          <span className="text-2xl font-bold text-focus-600 dark:text-focus-400">
            {elapsedMinutes}m
          </span>
        </div>
        <div className="flex flex-col items-center rounded-xl bg-white px-6 py-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
          <span className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Lock Level
          </span>
          <span className="text-2xl font-bold text-amber-500 dark:text-amber-400">
            {config?.lockLevel ?? "-"}
          </span>
        </div>
      </div>

      {/* Controls */}
      {config?.lockLevel !== 5 && (
        <Button variant="danger" onClick={requestUnlock}>
          Request Unlock
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unlock prompt view
// ---------------------------------------------------------------------------

function UnlockPromptView() {
  const config = useSessionStore((s) => s.config);
  const cancelUnlock = useSessionStore((s) => s.cancelUnlock);
  const stopSession = useSessionStore((s) => s.stopSession);

  const lockLevel = config?.lockLevel ?? 1;

  const handleSubmit = async (value: string): Promise<boolean> => {
    try {
      // Token verification happens in Rust (sha256 for now, Argon2 in Phase 2)
      await stopSession(value);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Unlock Session
      </h2>
      <p className="text-gray-500 dark:text-gray-400">
        Enter the token you wrote down to stop the session early.
      </p>
      <PasswordInput
        lockLevel={lockLevel}
        onSubmit={handleSubmit}
        onCancel={cancelUnlock}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schedule form
// ---------------------------------------------------------------------------

function ScheduleForm({ onClose }: { onClose: () => void }) {
  const addSchedule = useScheduleStore((s) => s.addSchedule);

  const [presetId, setPresetId] = useState(PRESETS[0]?.id ?? "");
  const [time, setTime] = useState("09:00");
  const [pattern, setPattern] = useState<SchedulePattern>("weekdays");
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [autoStart, setAutoStart] = useState(false);

  const selectedPreset = PRESETS.find((p) => p.id === presetId);

  const handleSubmit = () => {
    if (!selectedPreset) return;

    const days = pattern === "custom" ? customDays : getDaysForPattern(pattern);
    addSchedule({
      sessionPresetId: selectedPreset.id,
      presetName: selectedPreset.name,
      time,
      pattern,
      days,
      enabled: true,
      autoStart,
    });
    onClose();
  };

  const toggleCustomDay = (day: number) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Add Schedule
      </h3>
      <div className="space-y-4">
        {/* Preset selector */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Session Preset
          </label>
          <select
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-focus-500 focus:outline-none focus:ring-1 focus:ring-focus-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            {PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {getPresetEmoji(preset.icon)} {preset.name}
              </option>
            ))}
          </select>
        </div>

        {/* Time */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Start Time
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-focus-500 focus:outline-none focus:ring-1 focus:ring-focus-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Pattern */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Repeat Pattern
          </label>
          <div className="flex flex-wrap gap-2">
            {(["daily", "weekdays", "weekends", "custom"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPattern(p)}
                className={`rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-colors ${
                  pattern === p
                    ? "border-focus-500 bg-focus-50 text-focus-700 dark:border-focus-400 dark:bg-focus-900/20 dark:text-focus-400"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500"
                }`}
              >
                {PATTERN_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Custom day checkboxes */}
        {pattern === "custom" && (
          <div className="flex gap-2">
            {DAY_LABELS.map((label, idx) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleCustomDay(idx)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 text-xs font-medium transition-colors ${
                  customDays.includes(idx)
                    ? "border-focus-500 bg-focus-50 text-focus-700 dark:border-focus-400 dark:bg-focus-900/20 dark:text-focus-400"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Auto-start */}
        <Toggle
          checked={autoStart}
          onChange={setAutoStart}
          label="Auto-start"
          description="Automatically start the session at the scheduled time"
        />

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="primary" size="sm" onClick={handleSubmit}>
            Add Schedule
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Schedule list
// ---------------------------------------------------------------------------

function ScheduleList() {
  const schedules = useScheduleStore((s) => s.schedules);
  const toggleSchedule = useScheduleStore((s) => s.toggleSchedule);
  const deleteSchedule = useScheduleStore((s) => s.deleteSchedule);
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Scheduled Sessions
        </h2>
        {!showForm && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            + Add Schedule
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {showForm && <ScheduleForm onClose={() => setShowForm(false)} />}

        {schedules.map((schedule) => {
          const preset = PRESETS.find((p) => p.id === schedule.sessionPresetId);

          return (
            <Card key={schedule.id}>
              <div className="flex items-center gap-4">
                {/* Preset icon */}
                <span className="text-2xl">
                  {preset ? getPresetEmoji(preset.icon) : "\u23F0"}
                </span>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {schedule.presetName}
                    </span>
                    <span className="text-sm font-medium text-focus-600 dark:text-focus-400">
                      {schedule.time}
                    </span>
                    {schedule.autoStart && (
                      <Badge variant="info">Auto</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatScheduleDays(schedule.pattern, schedule.days)}
                  </p>
                </div>

                {/* Toggle & delete */}
                <Toggle
                  checked={schedule.enabled}
                  onChange={() => toggleSchedule(schedule.id)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteSchedule(schedule.id)}
                  className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Button>
              </div>
            </Card>
          );
        })}

        {schedules.length === 0 && !showForm && (
          <Card className="flex flex-col items-center gap-3 py-6">
            <span className="text-2xl">{"\u23F0"}</span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No scheduled sessions. Add one to automate your focus routine.
            </p>
          </Card>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Idle state
// ---------------------------------------------------------------------------

function IdleView() {
  const navigate = useNavigate();

  return (
    <div className="space-y-0">
      <div className="flex flex-col items-center gap-6">
        <Card className="flex max-w-md flex-col items-center gap-4 py-12">
          <span className="text-5xl">{"\uD83C\uDFAF"}</span>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            No Active Session
          </h2>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Start a new focus session to boost your productivity.
          </p>
          <Button variant="primary" size="lg" onClick={() => navigate("/launch")}>
            Start a Session
          </Button>
        </Card>
      </div>

      <ScheduleList />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review view
// ---------------------------------------------------------------------------

function ReviewView() {
  const review = useSessionStore((s) => s.review);
  const dismissReview = useSessionStore((s) => s.dismissReview);

  if (!review) return null;

  return <SessionReview review={review} onDismiss={dismissReview} />;
}

// ---------------------------------------------------------------------------
// Main sessions page
// ---------------------------------------------------------------------------

export function SessionsPage() {
  const phase = useSessionStore((s) => s.phase);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
        Sessions
      </h1>

      {phase === "active" && <ActiveSessionView />}
      {phase === "unlock-prompt" && <UnlockPromptView />}
      {phase === "review" && <ReviewView />}
      {(phase === "idle" || phase === "configuring") && <IdleView />}
    </div>
  );
}
