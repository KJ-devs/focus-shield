import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ChallengeCreateProps {
  onCreate: (title: string) => Promise<boolean>;
}

export function ChallengeCreate({ onCreate }: ChallengeCreateProps) {
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Please enter a challenge title");
      return;
    }

    setIsCreating(true);
    setError(null);

    const success = await onCreate(title.trim());

    if (success) {
      setTitle("");
    } else {
      setError("Failed to create challenge. Please try again.");
    }

    setIsCreating(false);
  };

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Create a Weekly Challenge
      </h3>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Start a new weekly focus challenge and invite others to compete on the
        leaderboard.
      </p>
      <div className="flex gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Challenge title (e.g., Deep Work Week)"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-focus-500 focus:outline-none focus:ring-1 focus:ring-focus-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          disabled={isCreating}
        />
        <Button
          onClick={() => void handleCreate()}
          disabled={isCreating || !title.trim()}
          size="md"
        >
          {isCreating ? "Creating..." : "Create"}
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </Card>
  );
}
