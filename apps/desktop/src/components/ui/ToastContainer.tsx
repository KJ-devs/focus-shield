import { useNotificationStore, type ToastLevel } from "@/stores/notification-store";

function levelStyles(level: ToastLevel): string {
  switch (level) {
    case "info":
      return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200";
    case "error":
      return "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200";
  }
}

function levelIcon(level: ToastLevel): string {
  switch (level) {
    case "info": return "\u2139\uFE0F";
    case "warning": return "\u26A0\uFE0F";
    case "error": return "\u274C";
  }
}

export function ToastContainer() {
  const toasts = useNotificationStore((s) => s.toasts);
  const removeToast = useNotificationStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg animate-[slideInRight_0.3s_ease-out] max-w-sm ${levelStyles(toast.level)}`}
        >
          <span className="mt-0.5 shrink-0">{levelIcon(toast.level)}</span>
          <p className="flex-1 text-sm">{toast.message}</p>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-current opacity-50 transition-opacity hover:opacity-100"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
