import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface RoomJoinProps {
  onJoin: (inviteCode: string) => Promise<boolean>;
}

export function RoomJoin({ onJoin }: RoomJoinProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError("Please enter an invite code");
      return;
    }

    setIsJoining(true);
    setError(null);

    const success = await onJoin(inviteCode.trim());

    if (success) {
      setInviteCode("");
    } else {
      setError("Failed to join room. Please check the invite code.");
    }

    setIsJoining(false);
  };

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Join a Room
      </h3>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Enter an invite code to join an existing coworking room.
      </p>
      <div className="flex gap-3">
        <input
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="Invite code"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-focus-500 focus:outline-none focus:ring-1 focus:ring-focus-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          disabled={isJoining}
        />
        <Button
          onClick={() => void handleJoin()}
          disabled={isJoining || !inviteCode.trim()}
          variant="secondary"
          size="md"
        >
          {isJoining ? "Joining..." : "Join"}
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </Card>
  );
}
