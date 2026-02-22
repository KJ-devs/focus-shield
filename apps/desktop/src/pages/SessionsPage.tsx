import { useNavigate } from "react-router-dom";
import { useSessionStore } from "@/stores/session-store";
import { CircularTimer } from "@/components/session/CircularTimer";
import { PasswordInput } from "@/components/session/PasswordInput";
import { SessionReview } from "@/components/session/SessionReview";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

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
      <Badge variant="success">Session Active</Badge>

      <CircularTimer
        timeRemainingMs={timeRemainingMs}
        totalDurationMs={totalDurationMs}
        sessionName={sessionName}
      />

      <BlockProgression />

      {/* Stats row */}
      <div className="flex gap-8">
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Distractions
          </span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {distractionCount}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Elapsed
          </span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {elapsedMinutes}m
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Lock Level
          </span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
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
  const forceStop = useSessionStore((s) => s.forceStop);

  const lockLevel = config?.lockLevel ?? 1;

  const handleSubmit = (_value: string) => {
    // In a full implementation, this would verify the token hash.
    // For now, accept any non-empty input as a successful unlock.
    forceStop(true);
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
// Idle state
// ---------------------------------------------------------------------------

function IdleView() {
  const navigate = useNavigate();

  return (
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
