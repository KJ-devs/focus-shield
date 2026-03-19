import { create } from "zustand";

export type ToastLevel = "info" | "warning" | "error";

export interface Toast {
  id: string;
  level: ToastLevel;
  message: string;
  dismissAfterMs: number;
}

interface NotificationState {
  toasts: Toast[];
  addToast: (level: ToastLevel, message: string, dismissAfterMs?: number) => void;
  removeToast: (id: string) => void;
}

let nextId = 0;

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],

  addToast: (level, message, dismissAfterMs = 5000) => {
    const id = `toast-${++nextId}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-4), { id, level, message, dismissAfterMs }],
    }));

    if (dismissAfterMs > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, dismissAfterMs);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

/** Shorthand helpers */
export function toastInfo(message: string): void {
  useNotificationStore.getState().addToast("info", message);
}

export function toastWarning(message: string): void {
  useNotificationStore.getState().addToast("warning", message);
}

export function toastError(message: string): void {
  useNotificationStore.getState().addToast("error", message, 8000);
}
