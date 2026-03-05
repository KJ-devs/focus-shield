import { type ReactNode } from "react";

type BadgeVariant = "success" | "warning" | "danger" | "info";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  success:
    "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/20",
  warning:
    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 ring-1 ring-inset ring-yellow-600/20 dark:ring-yellow-500/20",
  danger:
    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-600/20 dark:ring-red-500/20",
  info:
    "bg-focus-100 dark:bg-focus-900/30 text-focus-700 dark:text-focus-400 ring-1 ring-inset ring-focus-600/20 dark:ring-focus-500/20",
};

export function Badge({ children, variant = "info" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
