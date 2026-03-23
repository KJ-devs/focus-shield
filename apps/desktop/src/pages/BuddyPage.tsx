import { useState, useEffect, useCallback } from "react";
import { BuddyList } from "@/components/buddy/BuddyList";
import { BuddyInvite } from "@/components/buddy/BuddyInvite";
import { BuddyNotifications } from "@/components/buddy/BuddyNotifications";
import {
  SyncClient,
  type BuddyWithUser,
  type BuddyNotificationData,
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

export function BuddyPage() {
  const [buddies, setBuddies] = useState<BuddyWithUser[]>([]);
  const [notifications, setNotifications] = useState<BuddyNotificationData[]>(
    [],
  );
  const [isLoadingBuddies, setIsLoadingBuddies] = useState(true);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);

  const loadBuddies = useCallback(async () => {
    setIsLoadingBuddies(true);
    try {
      const client = getSyncClient();
      const response = await client.getBuddies();
      if (response.success && response.data) {
        setBuddies(response.data);
      }
    } catch {
      // Silently handle errors; empty list shown
    } finally {
      setIsLoadingBuddies(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setIsLoadingNotifications(true);
    try {
      const client = getSyncClient();
      const response = await client.getBuddyNotifications();
      if (response.success && response.data) {
        setNotifications(response.data);
      }
    } catch {
      // Silently handle errors; empty list shown
    } finally {
      setIsLoadingNotifications(false);
    }
  }, []);

  useEffect(() => {
    void loadBuddies();
    void loadNotifications();
  }, [loadBuddies, loadNotifications]);

  const handleCreateInvite = async (): Promise<string | null> => {
    try {
      const client = getSyncClient();
      const response = await client.createBuddyInvite();
      if (response.success && response.data) {
        return response.data.inviteCode;
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleAcceptInvite = async (code: string): Promise<boolean> => {
    try {
      const client = getSyncClient();
      const response = await client.acceptBuddyInvite(code);
      if (response.success) {
        await loadBuddies();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleRemoveBuddy = async (buddyId: string) => {
    try {
      const client = getSyncClient();
      const response = await client.removeBuddy(buddyId);
      if (response.success) {
        setBuddies((prev) => prev.filter((b) => b.id !== buddyId));
      }
    } catch {
      // Silently handle errors
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      const client = getSyncClient();
      await client.markBuddyNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n,
        ),
      );
    } catch {
      // Silently handle errors
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
        Focus Buddies
      </h1>

      <div className="space-y-6">
        <BuddyInvite
          onCreateInvite={handleCreateInvite}
          onAcceptInvite={handleAcceptInvite}
        />

        <BuddyList
          buddies={buddies}
          onRemove={handleRemoveBuddy}
          isLoading={isLoadingBuddies}
        />

        <BuddyNotifications
          notifications={notifications}
          onMarkRead={handleMarkNotificationRead}
          isLoading={isLoadingNotifications}
        />
      </div>
    </div>
  );
}
