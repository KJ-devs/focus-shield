import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useThemeStore } from "@/stores/theme-store";
import { ProfileSwitcher } from "@/components/profiles/ProfileSwitcher";
import { daemonHealthCheck, daemonExtensionStatus } from "@/tauri/daemon";
import { LevelBadge } from "@/components/gamification/LevelBadge";

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

function IconTrophy() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h8v6a4 4 0 01-8 0V3z" />
      <path d="M6 5H3.5a1 1 0 00-1 1v1a3 3 0 003 3H6M14 5h2.5a1 1 0 011 1v1a3 3 0 01-3 3H14" />
      <path d="M10 13v3M7 16h6" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3h5a2 2 0 012 2v12a1.5 1.5 0 00-1.5-1.5H4V3zM16 3h-5a2 2 0 00-2 2v12a1.5 1.5 0 011.5-1.5H16V3z" />
    </svg>
  );
}

function IconGraduationCap() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3L2 7l8 4 8-4-8-4z" />
      <path d="M4 9v4.5c0 1.5 2.7 3 6 3s6-1.5 6-3V9" />
      <path d="M17 7v6" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "nav.home", icon: <IconHome /> },
  { to: "/sessions", label: "nav.sessions", icon: <IconPlay /> },
  { to: "/blocklists", label: "nav.blocklists", icon: <IconShieldNav /> },
  { to: "/analytics", label: "nav.analytics", icon: <IconChart /> },
  { to: "/knowledge", label: "nav.knowledge", icon: <IconBook /> },
  { to: "/study", label: "nav.study", icon: <IconGraduationCap /> },
  { to: "/achievements", label: "nav.achievements", icon: <IconTrophy /> },
  { to: "/profiles", label: "nav.profiles", icon: <IconUser /> },
  { to: "/settings", label: "nav.settings", icon: <IconSettings /> },
];

function NavItemLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const { t } = useTranslation();
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      onClick={onNavigate}
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
          <span>{t(item.label)}</span>
        </>
      )}
    </NavLink>
  );
}

interface ProtectionStatus {
  daemon: "connected" | "disconnected" | "checking";
  extension: "connected" | "disconnected" | "checking";
}

function useProtectionStatus(): ProtectionStatus {
  const [status, setStatus] = useState<ProtectionStatus>({
    daemon: "checking",
    extension: "checking",
  });

  useEffect(() => {
    let mounted = true;

    async function check(): Promise<void> {
      let daemonAlive = false;
      try {
        daemonAlive = await daemonHealthCheck();
      } catch {
        // daemon not reachable
      }

      let extensionConnected = false;
      if (daemonAlive) {
        try {
          const extStatus = await daemonExtensionStatus();
          extensionConnected = extStatus.connected;
        } catch {
          // extension status unavailable
        }
      }

      if (mounted) {
        setStatus({
          daemon: daemonAlive ? "connected" : "disconnected",
          extension: daemonAlive && extensionConnected ? "connected" : "disconnected",
        });
      }
    }

    void check();
    const interval = setInterval(() => void check(), 15_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return status;
}

function DaemonStatusBadge() {
  const { t } = useTranslation();
  const { daemon, extension } = useProtectionStatus();

  const daemonConfig = {
    checking: { color: "bg-gray-400", label: `${t("daemon.systemProtection")}: ${t("daemon.checking")}` },
    connected: { color: "bg-emerald-500", label: `${t("daemon.systemProtection")}: ${t("daemon.active")}` },
    disconnected: { color: "bg-red-500", label: `${t("daemon.systemProtection")}: ${t("daemon.inactive")}` },
  }[daemon];

  const extensionConfig = {
    checking: { color: "bg-gray-400", label: `${t("daemon.extension")}: ${t("daemon.checking")}` },
    connected: { color: "bg-emerald-500", label: `${t("daemon.extension")}: ${t("daemon.connected")}` },
    disconnected: { color: "bg-amber-500", label: `${t("daemon.extension")}: ${t("daemon.notConnected")}` },
  }[extension];

  return (
    <div className="space-y-1 px-3 py-1.5">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${daemonConfig.color}`} />
        <span className="text-xs text-gray-500 dark:text-gray-400">{daemonConfig.label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${extensionConfig.color}`} />
        <span className="text-xs text-gray-500 dark:text-gray-400">{extensionConfig.label}</span>
      </div>
    </div>
  );
}

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useThemeStore();

  const sidebarContent = (
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

      <div className="border-b border-gray-200 dark:border-gray-800">
        <LevelBadge />
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <NavItemLink key={item.to} item={item} onNavigate={onClose} />
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
          <span>{theme === "light" ? t("settings.darkMode") : t("settings.lightMode")}</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: static sidebar */}
      <div className="hidden lg:block">
        {sidebarContent}
      </div>

      {/* Mobile: overlay sidebar */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <div className="relative z-50 animate-[slideInLeft_0.2s_ease-out]">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
