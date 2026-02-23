import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface RoomCreateProps {
  onCreate: (name: string) => Promise<boolean>;
}

export function RoomCreate({ onCreate }: RoomCreateProps) {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Please enter a room name");
      return;
    }

    setIsCreating(true);
    setError(null);

    const success = await onCreate(name.trim());

    if (success) {
      setName("");
    } else {
      setError("Failed to create room. Please try again.");
    }

    setIsCreating(false);
  };

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Create a Coworking Room
      </h3>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Create a virtual coworking room and invite others to focus together.
      </p>
      <div className="flex gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Room name (e.g., Morning Focus)"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-focus-500 focus:outline-none focus:ring-1 focus:ring-focus-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          disabled={isCreating}
        />
        <Button
          onClick={() => void handleCreate()}
          disabled={isCreating || !name.trim()}
          size="md"
        >
          {isCreating ? "Creating..." : "Create Room"}
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </Card>
  );
}
