import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { RoomMemberDto, CoworkingRoomData } from "@/lib/sync-client";

interface CoworkingRoomProps {
  room: CoworkingRoomData;
  members: RoomMemberDto[];
  isHost: boolean;
  isLoading: boolean;
  onStartSync: () => void;
  onLeave: () => void;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "focusing":
      return <Badge variant="success">Focusing</Badge>;
    case "break":
      return <Badge variant="warning">On Break</Badge>;
    default:
      return <Badge variant="info">Idle</Badge>;
  }
}

function MemberRow({ member }: { member: RoomMemberDto }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-focus-100 text-sm font-semibold text-focus-700 dark:bg-focus-900/30 dark:text-focus-400">
          {member.displayName.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium text-gray-900 dark:text-white">
          {member.displayName}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {member.status === "focusing" && member.currentSessionMinutes != null && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {member.currentSessionMinutes}m session
          </span>
        )}
        {getStatusBadge(member.status)}
      </div>
    </div>
  );
}

export function CoworkingRoom({
  room,
  members,
  isHost,
  isLoading,
  onStartSync,
  onLeave,
}: CoworkingRoomProps) {
  if (isLoading) {
    return (
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {room.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {room.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Invite code:{" "}
            <span className="font-mono font-semibold text-focus-600 dark:text-focus-400">
              {room.inviteCode}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isHost && (
            <Button onClick={onStartSync} size="sm">
              Start Sync Session
            </Button>
          )}
          <Button
            onClick={onLeave}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 dark:text-red-400"
          >
            Leave
          </Button>
        </div>
      </div>

      <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Members ({members.length})
      </h4>

      {members.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No members yet.
        </p>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <MemberRow key={member.userId} member={member} />
          ))}
        </div>
      )}
    </Card>
  );
}
