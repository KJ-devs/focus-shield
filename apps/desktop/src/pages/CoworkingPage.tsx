import { useState, useEffect, useCallback } from "react";
import { RoomCreate } from "@/components/coworking/RoomCreate";
import { RoomJoin } from "@/components/coworking/RoomJoin";
import { CoworkingRoom } from "@/components/coworking/CoworkingRoom";
import {
  SyncClient,
  type CoworkingRoomData,
  type RoomMemberDto,
} from "@/lib/sync-client";

const SYNC_SERVER_URL = "http://localhost:3000";

function getSyncClient(): SyncClient {
  const client = new SyncClient(SYNC_SERVER_URL);
  const storedToken = localStorage.getItem("sync-token");
  if (storedToken) {
    client.setToken(storedToken);
  }
  return client;
}

export function CoworkingPage() {
  const [rooms, setRooms] = useState<CoworkingRoomData[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [members, setMembers] = useState<RoomMemberDto[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const currentUserId = localStorage.getItem("sync-user-id");

  const loadRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    try {
      const client = getSyncClient();
      const response = await client.getMyCoworkingRooms();
      if (response.success && response.data) {
        setRooms(response.data);
        const firstRoom = response.data[0];
        if (firstRoom && !selectedRoomId) {
          setSelectedRoomId(firstRoom.id);
        }
      }
    } catch {
      // Silently handle errors
    } finally {
      setIsLoadingRooms(false);
    }
  }, [selectedRoomId]);

  const loadMembers = useCallback(async (roomId: string) => {
    setIsLoadingMembers(true);
    try {
      const client = getSyncClient();
      const response = await client.getCoworkingRoomMembers(roomId);
      if (response.success && response.data) {
        setMembers(response.data);
      }
    } catch {
      // Silently handle errors
    } finally {
      setIsLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (selectedRoomId) {
      void loadMembers(selectedRoomId);
    }
  }, [selectedRoomId, loadMembers]);

  const handleCreate = async (name: string): Promise<boolean> => {
    try {
      const client = getSyncClient();
      const response = await client.createCoworkingRoom(name);
      if (response.success && response.data) {
        await loadRooms();
        setSelectedRoomId(response.data.id);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleJoin = async (inviteCode: string): Promise<boolean> => {
    try {
      const client = getSyncClient();
      const response = await client.joinCoworkingRoom(inviteCode);
      if (response.success) {
        await loadRooms();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleLeave = async (roomId: string) => {
    try {
      const client = getSyncClient();
      const response = await client.leaveCoworkingRoom(roomId);
      if (response.success) {
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
        if (selectedRoomId === roomId) {
          setSelectedRoomId(null);
          setMembers([]);
        }
      }
    } catch {
      // Silently handle errors
    }
  };

  const handleStartSync = async (roomId: string) => {
    try {
      const client = getSyncClient();
      await client.startCoworkingSyncSession(roomId);
      await loadMembers(roomId);
    } catch {
      // Silently handle errors
    }
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
        Virtual Coworking
      </h1>

      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <RoomCreate onCreate={handleCreate} />
          <RoomJoin onJoin={handleJoin} />
        </div>

        {rooms.length > 0 && (
          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              Your Rooms
            </h3>
            <div className="flex flex-wrap gap-2">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    selectedRoomId === room.id
                      ? "bg-focus-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {room.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoadingRooms ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading rooms...
          </p>
        ) : (
          selectedRoom && (
            <CoworkingRoom
              room={selectedRoom}
              members={members}
              isHost={selectedRoom.hostId === currentUserId}
              isLoading={isLoadingMembers}
              onStartSync={() => void handleStartSync(selectedRoom.id)}
              onLeave={() => void handleLeave(selectedRoom.id)}
            />
          )
        )}
      </div>
    </div>
  );
}
