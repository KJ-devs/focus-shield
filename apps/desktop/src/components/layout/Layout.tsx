import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useTimer } from "@/hooks/useTimer";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { useGamificationStore } from "@/stores/gamification-store";

function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-md ring-1 ring-gray-200 transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:ring-gray-700 dark:hover:bg-gray-700 lg:hidden"
      aria-label="Open menu"
    >
      <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}

export function Layout() {
  useTimer();
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hydratedRef = useRef(false);

  // Hydrate gamification store on first mount
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      void useGamificationStore.getState().hydrate();
    }
  }, []);

  useEffect(() => {
    setIsTransitioning(true);
    const timeout = setTimeout(() => setIsTransitioning(false), 50);
    return () => clearTimeout(timeout);
  }, [location.pathname]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <HamburgerButton onClick={() => setSidebarOpen(true)} />
      <main className="flex-1 overflow-y-auto p-4 pt-16 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8">
        <div
          className={`transition-all duration-300 ease-out ${
            isTransitioning
              ? "translate-y-1 opacity-0"
              : "translate-y-0 opacity-100"
          }`}
        >
          <Outlet />
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}
