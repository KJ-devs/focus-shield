import { type ReactNode, type MouseEventHandler } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
  "data-testid"?: string;
}

export function Card({ children, className = "", onClick, "data-testid": testId }: CardProps) {
  return (
    <div
      data-testid={testId}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 p-6 transition-shadow duration-200 ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e as unknown as Parameters<MouseEventHandler<HTMLDivElement>>[0]); } } : undefined}
    >
      {children}
    </div>
  );
}
