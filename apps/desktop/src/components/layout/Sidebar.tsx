import { NavLink } from "react-router-dom";
import { useThemeStore } from "@/stores/theme-store";
import { ProfileSwitcher } from "@/components/profiles/ProfileSwitcher";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", icon: "\uD83C\uDFE0" },
  { to: "/sessions", label: "Sessions", icon: "\u25B6\uFE0F" },
  { to: "/blocklists", label: "Blocklists", icon: "\uD83D\uDEE1\uFE0F" },
  { to: "/analytics", label: "Analytics", icon: "\uD83D\uDCCA" },
  { to: "/profiles", label: "Profiles", icon: "\uD83D\uDC64" },
  { to: "/buddy", label: "Buddies", icon: "\uD83D\uDC65" },
  { to: "/settings", label: "Settings", icon: "\u2699\uFE0F" },
];

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? "bg-focus-50 dark:bg-focus-900/30 text-focus-600 dark:text-focus-400"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        }`
      }
    >
      <span className="text-lg">{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2 px-6 py-5">
        <span className="text-2xl">{"\uD83D\uDEE1\uFE0F"}</span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Focus Shield
        </h1>
      </div>

      <div className="mb-2 border-b border-gray-200 pb-2 dark:border-gray-800">
        <ProfileSwitcher />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}
      </nav>

      <div className="border-t border-gray-200 px-3 py-4 dark:border-gray-800">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <span className="text-lg">
            {theme === "light" ? "\uD83C\uDF19" : "\u2600\uFE0F"}
          </span>
          <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
        </button>
      </div>
    </aside>
  );
}
