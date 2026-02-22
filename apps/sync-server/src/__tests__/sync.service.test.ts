import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SyncService,
  PushSessionDto,
  PushStatsDto,
} from "../sync/sync.service";
import { SyncSession } from "../sync/sync-session.entity";
import { SyncStats } from "../sync/sync-stats.entity";
import { Repository, ObjectLiteral } from "typeorm";

function createMockRepository<T extends ObjectLiteral>(): Partial<Repository<T>> {
  return {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };
}

function createMockSession(
  overrides: Partial<SyncSession> = {},
): SyncSession {
  return {
    id: "session-uuid-1",
    userId: "user-uuid-1",
    clientSessionId: "client-session-1",
    name: "Test Session",
    blocks: [{ type: "focus", duration: 25 }],
    lockLevel: 2,
    completedAt: null,
    totalFocusMinutes: 25,
    focusScore: null,
    syncedAt: new Date("2026-01-15T10:00:00Z"),
    user: undefined as never,
    ...overrides,
  };
}

function createMockStats(overrides: Partial<SyncStats> = {}): SyncStats {
  return {
    id: "stats-uuid-1",
    userId: "user-uuid-1",
    date: "2026-01-15",
    totalFocusMinutes: 120,
    sessionsCompleted: 4,
    distractionAttempts: 7,
    averageFocusScore: 85,
    syncedAt: new Date("2026-01-15T23:00:00Z"),
    user: undefined as never,
    ...overrides,
  };
}

describe("SyncService", () => {
  let service: SyncService;
  let mockSessionRepo: ReturnType<typeof createMockRepository<SyncSession>>;
  let mockStatsRepo: ReturnType<typeof createMockRepository<SyncStats>>;

  beforeEach(() => {
    mockSessionRepo = createMockRepository<SyncSession>();
    mockStatsRepo = createMockRepository<SyncStats>();
    service = new SyncService(
      mockSessionRepo as Repository<SyncSession>,
      mockStatsRepo as Repository<SyncStats>,
    );
  });

  describe("pushSessions", () => {
    it("should save session data", async () => {
      const dto: PushSessionDto = {
        userId: "user-uuid-1",
        clientSessionId: "client-1",
        name: "Focus Session",
        blocks: [{ type: "focus", duration: 25 }],
        lockLevel: 2,
        completedAt: "2026-01-15T10:30:00Z",
        totalFocusMinutes: 25,
        focusScore: 90,
      };

      const mockEntity = createMockSession({
        clientSessionId: dto.clientSessionId,
        name: dto.name,
        focusScore: dto.focusScore,
      });

      vi.mocked(mockSessionRepo.create!).mockReturnValue(mockEntity);
      vi.mocked(mockSessionRepo.save!).mockResolvedValue([mockEntity] as never);

      const result = await service.pushSessions([dto]);

      expect(mockSessionRepo.create).toHaveBeenCalledTimes(1);
      expect(mockSessionRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should handle multiple sessions", async () => {
      const dtos: PushSessionDto[] = [
        {
          userId: "user-uuid-1",
          clientSessionId: "client-1",
          name: "Session 1",
          blocks: [{ type: "focus", duration: 25 }],
          lockLevel: 1,
          completedAt: null,
          totalFocusMinutes: 25,
          focusScore: null,
        },
        {
          userId: "user-uuid-1",
          clientSessionId: "client-2",
          name: "Session 2",
          blocks: [{ type: "focus", duration: 45 }],
          lockLevel: 3,
          completedAt: "2026-01-15T12:00:00Z",
          totalFocusMinutes: 45,
          focusScore: 95,
        },
      ];

      const mockEntities = dtos.map((dto, i) =>
        createMockSession({
          id: `session-uuid-${i}`,
          clientSessionId: dto.clientSessionId,
          name: dto.name,
        }),
      );

      vi.mocked(mockSessionRepo.create!)
        .mockReturnValueOnce(mockEntities[0]!)
        .mockReturnValueOnce(mockEntities[1]!);
      vi.mocked(mockSessionRepo.save!).mockResolvedValue(
        mockEntities as never,
      );

      const result = await service.pushSessions(dtos);

      expect(mockSessionRepo.create).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });
  });

  describe("pullSessions", () => {
    it("should return sessions for a user", async () => {
      const sessions = [
        createMockSession({ id: "s1" }),
        createMockSession({ id: "s2" }),
      ];

      vi.mocked(mockSessionRepo.find!).mockResolvedValue(sessions);

      const result = await service.pullSessions("user-uuid-1");

      expect(mockSessionRepo.find).toHaveBeenCalledWith({
        where: { userId: "user-uuid-1" },
        order: { syncedAt: "ASC" },
      });
      expect(result).toHaveLength(2);
    });

    it("should filter by since parameter", async () => {
      vi.mocked(mockSessionRepo.find!).mockResolvedValue([]);

      await service.pullSessions("user-uuid-1", "2026-01-15T00:00:00Z");

      expect(mockSessionRepo.find).toHaveBeenCalledWith({
        where: {
          userId: "user-uuid-1",
          syncedAt: expect.objectContaining({ _type: "moreThanOrEqual" }),
        },
        order: { syncedAt: "ASC" },
      });
    });

    it("should return empty array when no sessions found", async () => {
      vi.mocked(mockSessionRepo.find!).mockResolvedValue([]);

      const result = await service.pullSessions("nonexistent-user");

      expect(result).toEqual([]);
    });
  });

  describe("pushStats", () => {
    it("should create new stats when none exist", async () => {
      const dto: PushStatsDto = {
        userId: "user-uuid-1",
        date: "2026-01-15",
        totalFocusMinutes: 120,
        sessionsCompleted: 4,
        distractionAttempts: 7,
        averageFocusScore: 85,
      };

      const mockEntity = createMockStats();

      vi.mocked(mockStatsRepo.findOne!).mockResolvedValue(null);
      vi.mocked(mockStatsRepo.create!).mockReturnValue(mockEntity);
      vi.mocked(mockStatsRepo.save!).mockResolvedValue(mockEntity);

      const result = await service.pushStats([dto]);

      expect(mockStatsRepo.findOne).toHaveBeenCalled();
      expect(mockStatsRepo.create).toHaveBeenCalled();
      expect(mockStatsRepo.save).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("should update existing stats (upsert)", async () => {
      const dto: PushStatsDto = {
        userId: "user-uuid-1",
        date: "2026-01-15",
        totalFocusMinutes: 180,
        sessionsCompleted: 6,
        distractionAttempts: 10,
        averageFocusScore: 88,
      };

      const existingStats = createMockStats();
      const updatedStats = createMockStats({
        totalFocusMinutes: 180,
        sessionsCompleted: 6,
      });

      vi.mocked(mockStatsRepo.findOne!).mockResolvedValue(existingStats);
      vi.mocked(mockStatsRepo.save!).mockResolvedValue(updatedStats);

      const result = await service.pushStats([dto]);

      expect(mockStatsRepo.findOne).toHaveBeenCalled();
      expect(mockStatsRepo.create).not.toHaveBeenCalled();
      expect(mockStatsRepo.save).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe("pullStats", () => {
    it("should return stats for a user", async () => {
      const stats = [
        createMockStats({ date: "2026-01-14" }),
        createMockStats({ date: "2026-01-15" }),
      ];

      vi.mocked(mockStatsRepo.find!).mockResolvedValue(stats);

      const result = await service.pullStats("user-uuid-1");

      expect(mockStatsRepo.find).toHaveBeenCalledWith({
        where: { userId: "user-uuid-1" },
        order: { date: "ASC" },
      });
      expect(result).toHaveLength(2);
    });

    it("should filter by since parameter", async () => {
      vi.mocked(mockStatsRepo.find!).mockResolvedValue([]);

      await service.pullStats("user-uuid-1", "2026-01-15T00:00:00Z");

      expect(mockStatsRepo.find).toHaveBeenCalledWith({
        where: {
          userId: "user-uuid-1",
          syncedAt: expect.objectContaining({ _type: "moreThanOrEqual" }),
        },
        order: { date: "ASC" },
      });
    });

    it("should return empty array when no stats found", async () => {
      vi.mocked(mockStatsRepo.find!).mockResolvedValue([]);

      const result = await service.pullStats("nonexistent-user");

      expect(result).toEqual([]);
    });
  });
});
