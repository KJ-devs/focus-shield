import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { HomePage } from "@/pages/HomePage";
import { SessionsPage } from "@/pages/SessionsPage";
import { SessionLauncherPage } from "@/pages/SessionLauncherPage";
import { BlocklistsPage } from "@/pages/BlocklistsPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ProfilesPage } from "@/pages/ProfilesPage";
import { BuddyPage } from "@/pages/BuddyPage";
import { BlockedPage } from "@/components/blocked/BlockedPage";

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
          <Route path="buddy" element={<BuddyPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
