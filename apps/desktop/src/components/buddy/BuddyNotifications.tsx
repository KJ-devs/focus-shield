import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { BuddyNotificationData } from "@/lib/sync-client";

interface BuddyNotificationsProps {
  notifications: BuddyNotificationData[];
  onMarkRead: (notificationId: string) => void;
  isLoading: boolean;
}

const NOTIFICATION_ICONS: Record<string, string> = {
  override_used: "!",
  streak_broken: "X",
  session_completed: "V",
  achievement_unlocked: "*",
};

const NOTIFICATION_LABELS: Record<string, string> = {
  override_used: "Override Used",
  streak_broken: "Streak Broken",
  session_completed: "Session Completed",
  achievement_unlocked: "Achievement Unlocked",
};

function NotificationIcon({ type }: { type: string }) {
  const icon = NOTIFICATION_ICONS[type] ?? "?";
  const colorClass =
    type === "override_used" || type === "streak_broken"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";

  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${colorClass}`}
    >
      {icon}
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: BuddyNotificationData;
  onMarkRead: () => void;
}) {
  const label = NOTIFICATION_LABELS[notification.type] ?? notification.type;
  const timeAgo = formatTimeAgo(notification.createdAt);

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
        notification.read
          ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
          : "border-focus-200 bg-focus-50/50 dark:border-focus-800 dark:bg-focus-900/10"
      }`}
    >
      <NotificationIcon type={notification.type} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {notification.fromDisplayName}
          </span>
          <Badge
            variant={
              notification.type === "override_used" ||
              notification.type === "streak_broken"
                ? "warning"
                : "success"
            }
          >
            {label}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {notification.message}
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {timeAgo}
        </p>
      </div>
      {!notification.read && (
        <Button variant="ghost" size="sm" onClick={onMarkRead}>
          Mark read
        </Button>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function BuddyNotifications({
  notifications,
  onMarkRead,
  isLoading,
}: BuddyNotificationsProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (isLoading) {
    return (
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Notifications
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Notifications
        </h3>
        {unreadCount > 0 && (
          <Badge variant="info">{unreadCount} unread</Badge>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No notifications yet.
        </p>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={() => onMarkRead(notification.id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
