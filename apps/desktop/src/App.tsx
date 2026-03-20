import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { HomePage } from "@/pages/HomePage";
import { SessionsPage } from "@/pages/SessionsPage";
import { SessionLauncherPage } from "@/pages/SessionLauncherPage";
import { BlocklistsPage } from "@/pages/BlocklistsPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ProfilesPage } from "@/pages/ProfilesPage";
import { BuddyPage } from "@/pages/BuddyPage";
import { ChallengePage } from "@/pages/ChallengePage";
import { CoworkingPage } from "@/pages/CoworkingPage";
import { BlockedPage } from "@/components/blocked/BlockedPage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function ComingSoonBanner({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Card className="mb-6 flex items-center gap-3 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
        <span className="text-2xl">&#x1F6A7;</span>
        <div>
          <p className="font-medium text-amber-800 dark:text-amber-300">Coming Soon</p>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            This feature requires a sync server and is not yet available in the local-only version.
          </p>
        </div>
      </Card>
      {children}
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <span className="text-6xl">&#x1F50D;</span>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Page Not Found</h1>
      <p className="text-gray-500 dark:text-gray-400">
        The page you are looking for does not exist.
      </p>
      <Link to="/">
        <Button variant="primary">Go Home</Button>
      </Link>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Full-screen blocked page — outside Layout */}
        <Route path="blocked" element={<BlockedPage />} />

        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="launch" element={<SessionLauncherPage />} />
          <Route path="blocklists" element={<BlocklistsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="profiles" element={<ProfilesPage />} />
          <Route path="buddy" element={<ComingSoonBanner><BuddyPage /></ComingSoonBanner>} />
          <Route path="challenges" element={<ComingSoonBanner><ChallengePage /></ComingSoonBanner>} />
          <Route path="coworking" element={<ComingSoonBanner><CoworkingPage /></ComingSoonBanner>} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
