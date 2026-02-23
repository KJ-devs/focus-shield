import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface BuddyInviteProps {
  onCreateInvite: () => Promise<string | null>;
  onAcceptInvite: (code: string) => Promise<boolean>;
}

type InviteMode = "idle" | "create" | "enter";

export function BuddyInvite({
  onCreateInvite,
  onAcceptInvite,
}: BuddyInviteProps) {
  const [mode, setMode] = useState<InviteMode>("idle");
  const [inviteCode, setInviteCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [enterCode, setEnterCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCreateInvite = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const code = await onCreateInvite();
    if (code) {
      setGeneratedCode(code);
      setInviteCode(code);
      setMode("create");
    } else {
      setError("Failed to create invite");
    }

    setIsLoading(false);
  };

  const handleAcceptInvite = async () => {
    if (!enterCode.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const success = await onAcceptInvite(enterCode.trim());
    if (success) {
      setSuccessMessage("Buddy invite accepted!");
      setEnterCode("");
      setMode("idle");
    } else {
      setError("Failed to accept invite. Check the code and try again.");
    }

    setIsLoading(false);
  };

  const handleCopyCode = async () => {
    if (generatedCode) {
      await navigator.clipboard.writeText(generatedCode);
    }
  };

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Add a Buddy
      </h3>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          {successMessage}
        </div>
      )}

      {mode === "idle" && (
        <div className="flex gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateInvite}
            disabled={isLoading}
          >
            Create Invite Code
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setMode("enter");
              setError(null);
              setSuccessMessage(null);
            }}
          >
            Enter Invite Code
          </Button>
        </div>
      )}

      {mode === "create" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Share this code with your buddy:
          </p>
          <div className="flex items-center gap-3">
            <code className="rounded-lg bg-gray-100 px-4 py-2 text-lg font-mono font-bold tracking-wider text-gray-900 dark:bg-gray-700 dark:text-white">
              {inviteCode}
            </code>
            <Button variant="secondary" size="sm" onClick={handleCopyCode}>
              Copy
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMode("idle");
              setGeneratedCode(null);
            }}
          >
            Done
          </Button>
        </div>
      )}

      {mode === "enter" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enter the invite code from your buddy:
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={enterCode}
              onChange={(e) => setEnterCode(e.target.value)}
              placeholder="Enter 8-character code"
              maxLength={8}
              className="w-48 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono tracking-wider text-gray-900 placeholder-gray-400 focus:border-focus-500 focus:outline-none focus:ring-1 focus:ring-focus-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleAcceptInvite}
              disabled={isLoading || !enterCode.trim()}
            >
              Accept
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMode("idle");
              setEnterCode("");
              setError(null);
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </Card>
  );
}
