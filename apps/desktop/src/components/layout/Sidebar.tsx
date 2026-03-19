import { type ReactNode, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useThemeStore } from "@/stores/theme-store";
import { ProfileSwitcher } from "@/components/profiles/ProfileSwitcher";
import { daemonHealthCheck } from "@/tauri/daemon";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

function IconHome() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L10 4l7 6.5" />
      <path d="M5 9.5V16a1 1 0 001 1h3v-4h2v4h3a1 1 0 001-1V9.5" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 4.5v11l9-5.5-9-5.5z" />
    </svg>
  );
}

function IconShieldNav() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2L3 6v4c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-4z" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17V9M7.5 17V5M12 17V8M16.5 17V3" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="7" r="3.5" />
      <path d="M3.5 17.5c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="7" r="3" />
      <circle cx="14" cy="7.5" r="2.5" />
      <path d="M1.5 17c0-3 2.5-5.5 6-5.5s6 2.5 6 5.5" />
      <path d="M13 11.5c2 0 4.5 1.5 4.5 4" />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h8v5a4 4 0 01-8 0V3z" />
      <path d="M6 5H4a2 2 0 000 4h2M14 5h2a2 2 0 010 4h-2" />
      <path d="M10 12v3M7 17h6" />
    </svg>
  );
}

function IconVideo() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="11" height="10" rx="1.5" />
      <path d="M13 8.5l5-2.5v8l-5-2.5" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v2M10 16v2M3.5 5.5l1.5 1.5M15 13l1.5 1.5M2 10h2M16 10h2M3.5 14.5l1.5-1.5M15 7l1.5-1.5" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 12.5A7.5 7.5 0 117.5 3a5.5 5.5 0 009.5 9.5z" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 2v2M10 16v2M3.5 5.5l1.5 1.5M15 13l1.5 1.5M2 10h2M16 10h2M3.5 14.5l1.5-1.5M15 7l1.5-1.5" />
    </svg>
  );
}

function ShieldLogo() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none">
      <path
        d="M16 2L4 8v8c0 7.2 4.8 13.6 12 16 7.2-2.4 12-8.8 12-16V8L16 2z"
        className="fill-focus-600 dark:fill-focus-500"
      />
      <path
        d="M16 6L8 10v5c0 5 3.3 9.4 8 11 4.7-1.6 8-6 8-11v-5L16 6z"
        className="fill-focus-400 dark:fill-focus-300"
        opacity="0.4"
      />
      <path
        d="M13 15l2.5 2.5L20 12"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", icon: <IconHome /> },
  { to: "/sessions", label: "Sessions", icon: <IconPlay /> },
  { to: "/blocklists", label: "Blocklists", icon: <IconShieldNav /> },
  { to: "/analytics", label: "Analytics", icon: <IconChart /> },
  { to: "/profiles", label: "Profiles", icon: <IconUser /> },
  { to: "/buddy", label: "Buddies", icon: <IconUsers /> },
  { to: "/challenges", label: "Challenges", icon: <IconTrophy /> },
  { to: "/coworking", label: "Coworking", icon: <IconVideo /> },
  { to: "/settings", label: "Settings", icon: <IconSettings /> },
];

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-focus-50 dark:bg-focus-900/30 text-focus-600 dark:text-focus-400"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-focus-600 dark:bg-focus-400" />
          )}
          <span className={`transition-colors duration-200 ${isActive ? "text-focus-600 dark:text-focus-400" : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"}`}>
            {item.icon}
          </span>
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

type DaemonStatus = "connected" | "extension-only" | "disconnected" | "checking";

function useDaemonStatus(): DaemonStatus {
  const [status, setStatus] = useState<DaemonStatus>("checking");

  useEffect(() => {
    let mounted = true;

    async function check(): Promise<void> {
      try {
        const alive = await daemonHealthCheck();
        if (mounted) setStatus(alive ? "connected" : "extension-only");
      } catch {
        if (mounted) setStatus("disconnected");
      }
    }

    void check();
    const interval = setInterval(() => void check(), 15_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return status;
}

function DaemonStatusBadge() {
  const status = useDaemonStatus();

  const config = {
    checking: { color: "bg-gray-400", label: "Checking...", ring: "" },
    connected: { color: "bg-emerald-500", label: "Full protection", ring: "ring-2 ring-emerald-500/20" },
    "extension-only": { color: "bg-amber-500", label: "Browser only", ring: "ring-2 ring-amber-500/20" },
    disconnected: { color: "bg-red-500", label: "No protection", ring: "ring-2 ring-red-500/20" },
  }[status];

  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <span className={`h-2 w-2 shrink-0 rounded-full ${config.color} ${config.ring}`} />
      <span className="text-xs text-gray-500 dark:text-gray-400">{config.label}</span>
    </div>
  );
}

export function Sidebar() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3 px-6 py-5">
        <ShieldLogo />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Focus Shield
        </h1>
      </div>

      <div className="mb-2 border-b border-gray-200 pb-2 dark:border-gray-800">
        <ProfileSwitcher />
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}
      </nav>

      <div className="border-t border-gray-200 px-3 py-4 dark:border-gray-800">
        <DaemonStatusBadge />
        <button
          onClick={toggleTheme}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <span className="text-gray-400 transition-colors duration-200 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300">
            {theme === "light" ? <IconMoon /> : <IconSun />}
          </span>
          <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
        </button>
      </div>
    </aside>
  );
}
