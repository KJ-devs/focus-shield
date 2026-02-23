import { useState, useEffect, useCallback } from "react";
import { ChallengeCreate } from "@/components/challenge/ChallengeCreate";
import { Leaderboard } from "@/components/challenge/Leaderboard";
import { WeeklyReport } from "@/components/challenge/WeeklyReport";
import {
  SyncClient,
  type ChallengeData,
  type LeaderboardEntry,
  type WeeklyReportData,
} from "@/lib/sync-client";

const SYNC_SERVER_URL = "http://localhost:3000";

function getSyncClient(): SyncClient {
  const client = new SyncClient(SYNC_SERVER_URL);
  const storedToken = localStorage.getItem("sync-token");
  if (storedToken) {
    client.setToken(storedToken);
  }
  return client;
}

export function ChallengePage() {
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    null,
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [reports, setReports] = useState<WeeklyReportData[]>([]);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(true);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  const loadChallenges = useCallback(async () => {
    setIsLoadingChallenges(true);
    try {
      const client = getSyncClient();
      const response = await client.getActiveChallenges();
      if (response.success && response.data) {
        setChallenges(response.data);
        const firstChallenge = response.data[0];
        if (firstChallenge && !selectedChallengeId) {
          setSelectedChallengeId(firstChallenge.id);
        }
      }
    } catch {
      // Silently handle errors
    } finally {
      setIsLoadingChallenges(false);
    }
  }, [selectedChallengeId]);

  const loadLeaderboard = useCallback(async (challengeId: string) => {
    setIsLoadingLeaderboard(true);
    try {
      const client = getSyncClient();
      const response = await client.getLeaderboard(challengeId);
      if (response.success && response.data) {
        setLeaderboard(response.data);
      }
    } catch {
      // Silently handle errors
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      const client = getSyncClient();
      const response = await client.getWeeklyReport();
      if (response.success && response.data) {
        setReports(response.data);
      }
    } catch {
      // Silently handle errors
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    void loadChallenges();
    void loadReports();
  }, [loadChallenges, loadReports]);

  useEffect(() => {
    if (selectedChallengeId) {
      void loadLeaderboard(selectedChallengeId);
    }
  }, [selectedChallengeId, loadLeaderboard]);

  const handleCreate = async (title: string): Promise<boolean> => {
    try {
      const client = getSyncClient();
      const response = await client.createChallenge(title);
      if (response.success && response.data) {
        await loadChallenges();
        setSelectedChallengeId(response.data.id);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const selectedChallenge = challenges.find(
    (c) => c.id === selectedChallengeId,
  );

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
        Challenges
      </h1>

      <div className="space-y-6">
        <ChallengeCreate onCreate={handleCreate} />

        {challenges.length > 0 && (
          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              Active Challenges
            </h3>
            <div className="flex flex-wrap gap-2">
              {challenges.map((challenge) => (
                <button
                  key={challenge.id}
                  onClick={() => setSelectedChallengeId(challenge.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    selectedChallengeId === challenge.id
                      ? "bg-focus-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {challenge.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoadingChallenges ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading challenges...
          </p>
        ) : (
          selectedChallenge && (
            <Leaderboard
              entries={leaderboard}
              challengeTitle={selectedChallenge.title}
              isLoading={isLoadingLeaderboard}
            />
          )
        )}

        <WeeklyReport reports={reports} isLoading={isLoadingReports} />
      </div>
    </div>
  );
}
