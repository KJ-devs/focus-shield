interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

interface RegisterRequest {
  email: string;
  displayName: string;
}

interface RegisterResponse {
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

interface SyncSession {
  id: string;
  userId: string;
  clientSessionId: string;
  name: string;
  blocks: Record<string, unknown>[];
  lockLevel: number;
  completedAt: string | null;
  totalFocusMinutes: number;
  focusScore: number | null;
  syncedAt: string;
}

interface PushSessionPayload {
  clientSessionId: string;
  name: string;
  blocks: Record<string, unknown>[];
  lockLevel: number;
  completedAt: string | null;
  totalFocusMinutes: number;
  focusScore: number | null;
}

interface SyncStats {
  id: string;
  userId: string;
  date: string;
  totalFocusMinutes: number;
  sessionsCompleted: number;
  distractionAttempts: number;
  averageFocusScore: number;
  syncedAt: string;
}

interface PushStatsPayload {
  date: string;
  totalFocusMinutes: number;
  sessionsCompleted: number;
  distractionAttempts: number;
  averageFocusScore: number;
  syncedAt?: string;
}

interface SyncConfigData {
  id: string;
  userId: string;
  configData: Record<string, unknown>;
  syncedAt: string;
}

interface BuddyInviteResponse {
  id: string;
  requesterId: string;
  responderId: string | null;
  status: string;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface BuddyWithUser {
  id: string;
  buddyUserId: string;
  buddyDisplayName: string;
  status: string;
  createdAt: string;
}

export interface BuddyNotificationData {
  id: string;
  buddyPairId: string;
  fromUserId: string;
  fromDisplayName: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ChallengeData {
  id: string;
  creatorId: string;
  title: string;
  weekStart: string;
  weekEnd: string;
  isActive: boolean;
  createdAt: string;
  participants?: ChallengeParticipantData[];
}

export interface ChallengeParticipantData {
  id: string;
  challengeId: string;
  userId: string;
  totalFocusMinutes: number;
  sessionsCompleted: number;
  rank: number;
  joinedAt: string | null;
  user?: { id: string; displayName: string };
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalFocusMinutes: number;
  sessionsCompleted: number;
  rank: number;
}

export interface WeeklyReportData {
  totalFocusMinutes: number;
  sessionsCompleted: number;
  rank: number;
  totalParticipants: number;
  challengeTitle: string;
}

export interface CoworkingRoomData {
  id: string;
  name: string;
  hostId: string;
  isActive: boolean;
  inviteCode: string;
  createdAt: string;
  members?: CoworkingMemberData[];
}

export interface CoworkingMemberData {
  id: string;
  roomId: string;
  userId: string;
  status: string;
  currentSessionMinutes: number | null;
  sessionStartedAt: string | null;
  joinedAt: string | null;
  user?: { id: string; displayName: string };
}

export interface RoomMemberDto {
  userId: string;
  displayName: string;
  status: string;
  currentSessionMinutes: number | null;
  sessionStartedAt: string | null;
}

export class SyncClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly serverError?: string,
  ) {
    super(message);
    this.name = "SyncClientError";
  }
}

export class SyncClient {
  private token: string | null = null;

  constructor(private readonly baseUrl: string) {}

  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = null;
  }

  getToken(): string | null {
    return this.token;
  }

  async register(
    email: string,
    displayName: string,
  ): Promise<ApiResponse<RegisterResponse>> {
    const payload: RegisterRequest = { email, displayName };
    return this.request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async login(): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>("/auth/login", {
      method: "POST",
    });
  }

  async pushSessions(
    sessions: PushSessionPayload[],
  ): Promise<ApiResponse<SyncSession[]>> {
    return this.request<SyncSession[]>("/sync/sessions", {
      method: "POST",
      body: JSON.stringify({ sessions }),
    });
  }

  async pullSessions(since?: string): Promise<ApiResponse<SyncSession[]>> {
    const params = new URLSearchParams();
    if (since) {
      params.set("since", since);
    }

    const query = params.toString();
    const path = query ? `/sync/sessions?${query}` : "/sync/sessions";
    return this.request<SyncSession[]>(path, { method: "GET" });
  }

  async pushStats(
    stats: PushStatsPayload[],
  ): Promise<ApiResponse<SyncStats[]>> {
    return this.request<SyncStats[]>("/sync/stats", {
      method: "POST",
      body: JSON.stringify({ stats }),
    });
  }

  async pullStats(since?: string): Promise<ApiResponse<SyncStats[]>> {
    const params = new URLSearchParams();
    if (since) {
      params.set("since", since);
    }

    const query = params.toString();
    const path = query ? `/sync/stats?${query}` : "/sync/stats";
    return this.request<SyncStats[]>(path, { method: "GET" });
  }

  async pushConfig(
    configData: Record<string, unknown>,
  ): Promise<ApiResponse<SyncConfigData>> {
    return this.request<SyncConfigData>("/sync/config", {
      method: "POST",
      body: JSON.stringify({ configData }),
    });
  }

  async pullConfig(): Promise<ApiResponse<SyncConfigData | null>> {
    return this.request<SyncConfigData | null>("/sync/config", {
      method: "GET",
    });
  }

  async createBuddyInvite(): Promise<ApiResponse<BuddyInviteResponse>> {
    return this.request<BuddyInviteResponse>("/buddy/invite", {
      method: "POST",
    });
  }

  async acceptBuddyInvite(
    inviteCode: string,
  ): Promise<ApiResponse<BuddyInviteResponse>> {
    return this.request<BuddyInviteResponse>("/buddy/accept", {
      method: "POST",
      body: JSON.stringify({ inviteCode }),
    });
  }

  async declineBuddyInvite(
    inviteCode: string,
  ): Promise<ApiResponse<BuddyInviteResponse>> {
    return this.request<BuddyInviteResponse>("/buddy/decline", {
      method: "POST",
      body: JSON.stringify({ inviteCode }),
    });
  }

  async getBuddies(): Promise<ApiResponse<BuddyWithUser[]>> {
    return this.request<BuddyWithUser[]>("/buddy/list", {
      method: "GET",
    });
  }

  async removeBuddy(
    buddyId: string,
  ): Promise<ApiResponse<{ removed: boolean }>> {
    return this.request<{ removed: boolean }>(`/buddy/${buddyId}`, {
      method: "DELETE",
    });
  }

  async getBuddyNotifications(
    unreadOnly?: boolean,
  ): Promise<ApiResponse<BuddyNotificationData[]>> {
    const params = new URLSearchParams();
    if (unreadOnly) {
      params.set("unreadOnly", "true");
    }

    const query = params.toString();
    const path = query
      ? `/buddy/notifications?${query}`
      : "/buddy/notifications";
    return this.request<BuddyNotificationData[]>(path, { method: "GET" });
  }

  async markBuddyNotificationRead(
    notificationId: string,
  ): Promise<ApiResponse<unknown>> {
    return this.request<unknown>(`/buddy/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
  }

  // --- Challenge methods ---

  async createChallenge(title: string): Promise<ApiResponse<ChallengeData>> {
    return this.request<ChallengeData>("/challenges", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
  }

  async joinChallenge(
    challengeId: string,
  ): Promise<ApiResponse<ChallengeParticipantData>> {
    return this.request<ChallengeParticipantData>(
      `/challenges/${challengeId}/join`,
      { method: "POST" },
    );
  }

  async getLeaderboard(
    challengeId: string,
  ): Promise<ApiResponse<LeaderboardEntry[]>> {
    return this.request<LeaderboardEntry[]>(
      `/challenges/${challengeId}/leaderboard`,
      { method: "GET" },
    );
  }

  async getActiveChallenges(): Promise<ApiResponse<ChallengeData[]>> {
    return this.request<ChallengeData[]>("/challenges/active", {
      method: "GET",
    });
  }

  async updateChallengeStats(
    challengeId: string,
    focusMinutes: number,
    sessionsCompleted: number,
  ): Promise<ApiResponse<ChallengeParticipantData>> {
    return this.request<ChallengeParticipantData>(
      `/challenges/${challengeId}/stats`,
      {
        method: "PUT",
        body: JSON.stringify({ focusMinutes, sessionsCompleted }),
      },
    );
  }

  async getWeeklyReport(): Promise<ApiResponse<WeeklyReportData[]>> {
    return this.request<WeeklyReportData[]>("/challenges/weekly-report", {
      method: "GET",
    });
  }

  // --- Coworking methods ---

  async createCoworkingRoom(
    name: string,
  ): Promise<ApiResponse<CoworkingRoomData>> {
    return this.request<CoworkingRoomData>("/coworking/rooms", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async joinCoworkingRoom(
    inviteCode: string,
  ): Promise<ApiResponse<CoworkingMemberData>> {
    return this.request<CoworkingMemberData>("/coworking/rooms/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode }),
    });
  }

  async leaveCoworkingRoom(
    roomId: string,
  ): Promise<ApiResponse<{ left: boolean }>> {
    return this.request<{ left: boolean }>(
      `/coworking/rooms/${roomId}/leave`,
      { method: "DELETE" },
    );
  }

  async updateCoworkingStatus(
    roomId: string,
    status: string,
    sessionMinutes?: number,
  ): Promise<ApiResponse<CoworkingMemberData>> {
    return this.request<CoworkingMemberData>(
      `/coworking/rooms/${roomId}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status, sessionMinutes }),
      },
    );
  }

  async getCoworkingRoomMembers(
    roomId: string,
  ): Promise<ApiResponse<RoomMemberDto[]>> {
    return this.request<RoomMemberDto[]>(
      `/coworking/rooms/${roomId}/members`,
      { method: "GET" },
    );
  }

  async getMyCoworkingRooms(): Promise<ApiResponse<CoworkingRoomData[]>> {
    return this.request<CoworkingRoomData[]>("/coworking/rooms", {
      method: "GET",
    });
  }

  async startCoworkingSyncSession(
    roomId: string,
  ): Promise<ApiResponse<CoworkingMemberData[]>> {
    return this.request<CoworkingMemberData[]>(
      `/coworking/rooms/${roomId}/sync-start`,
      { method: "POST" },
    );
  }

  private async request<T>(
    path: string,
    init: RequestInit,
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      ...init,
      headers: {
        ...headers,
        ...(init.headers as Record<string, string> | undefined),
      },
    });

    if (!response.ok) {
      const body = await response.text();
      let serverError: string | undefined;

      try {
        const parsed = JSON.parse(body) as { message?: string };
        serverError = parsed.message;
      } catch {
        serverError = body;
      }

      throw new SyncClientError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        serverError,
      );
    }

    return response.json() as Promise<ApiResponse<T>>;
  }
}
