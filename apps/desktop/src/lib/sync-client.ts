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
