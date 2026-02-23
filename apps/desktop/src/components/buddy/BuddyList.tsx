import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { BuddyWithUser } from "@/lib/sync-client";

interface BuddyListProps {
  buddies: BuddyWithUser[];
  onRemove: (buddyId: string) => void;
  isLoading: boolean;
}

function BuddyCard({
  buddy,
  onRemove,
}: {
  buddy: BuddyWithUser;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-focus-100 text-lg font-semibold text-focus-700 dark:bg-focus-900/30 dark:text-focus-400">
          {buddy.buddyDisplayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {buddy.buddyDisplayName}
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="success">Connected</Badge>
          </div>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-600 hover:text-red-700 dark:text-red-400">
        Remove
      </Button>
    </div>
  );
}

export function BuddyList({ buddies, onRemove, isLoading }: BuddyListProps) {
  if (isLoading) {
    return (
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Your Buddies
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Your Buddies
      </h3>

      {buddies.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No buddies yet. Create or enter an invite code to add a focus buddy.
        </p>
      ) : (
        <div className="space-y-3">
          {buddies.map((buddy) => (
            <BuddyCard
              key={buddy.id}
              buddy={buddy}
              onRemove={() => onRemove(buddy.id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
