import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ChallengeService } from "../challenge/challenge.service";
import { Challenge } from "../challenge/challenge.entity";
import { ChallengeParticipant } from "../challenge/challenge-participant.entity";
import { Repository, ObjectLiteral } from "typeorm";

function createMockRepository<T extends ObjectLiteral>(): Partial<
  Repository<T>
> {
  return {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  };
}

function createMockChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: "challenge-uuid-1",
    creatorId: "user-uuid-1",
    creator: { id: "user-uuid-1", displayName: "Alice" } as Challenge["creator"],
    title: "Deep Work Week",
    weekStart: new Date("2026-02-23T00:00:00Z"),
    weekEnd: new Date("2026-03-01T23:59:59Z"),
    isActive: true,
    createdAt: new Date("2026-02-23T10:00:00Z"),
    participants: [],
    ...overrides,
  };
}

function createMockParticipant(
  overrides: Partial<ChallengeParticipant> = {},
): ChallengeParticipant {
  return {
    id: "participant-uuid-1",
    challengeId: "challenge-uuid-1",
    challenge: createMockChallenge() as ChallengeParticipant["challenge"],
    userId: "user-uuid-1",
    user: { id: "user-uuid-1", displayName: "Alice" } as ChallengeParticipant["user"],
    totalFocusMinutes: 0,
    sessionsCompleted: 0,
    rank: 1,
    joinedAt: new Date("2026-02-23T10:00:00Z"),
    ...overrides,
  };
}

describe("ChallengeService", () => {
  let service: ChallengeService;
  let mockChallengeRepo: ReturnType<typeof createMockRepository<Challenge>>;
  let mockParticipantRepo: ReturnType<
    typeof createMockRepository<ChallengeParticipant>
  >;

  beforeEach(() => {
    mockChallengeRepo = createMockRepository<Challenge>();
    mockParticipantRepo = createMockRepository<ChallengeParticipant>();
    service = new ChallengeService(
      mockChallengeRepo as Repository<Challenge>,
      mockParticipantRepo as Repository<ChallengeParticipant>,
    );
  });

  describe("createChallenge", () => {
    it("should create a challenge with the creator as the first participant", async () => {
      const mockChallenge = createMockChallenge();
      const mockParticipant = createMockParticipant();

      vi.mocked(mockChallengeRepo.create!).mockReturnValue(mockChallenge);
      vi.mocked(mockChallengeRepo.save!).mockResolvedValue(mockChallenge);
      vi.mocked(mockParticipantRepo.create!).mockReturnValue(mockParticipant);
      vi.mocked(mockParticipantRepo.save!).mockResolvedValue(mockParticipant);

      const result = await service.createChallenge("user-uuid-1", "Deep Work Week");

      expect(mockChallengeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          creatorId: "user-uuid-1",
          title: "Deep Work Week",
          isActive: true,
        }),
      );
      expect(mockChallengeRepo.save).toHaveBeenCalled();
      expect(mockParticipantRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          challengeId: mockChallenge.id,
          userId: "user-uuid-1",
          totalFocusMinutes: 0,
          sessionsCompleted: 0,
          rank: 1,
        }),
      );
      expect(mockParticipantRepo.save).toHaveBeenCalled();
      expect(result.id).toBe(mockChallenge.id);
    });

    it("should throw BadRequestException when title is empty", async () => {
      await expect(
        service.createChallenge("user-uuid-1", ""),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when title is whitespace only", async () => {
      await expect(
        service.createChallenge("user-uuid-1", "   "),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("joinChallenge", () => {
    it("should add a user as a participant to an existing active challenge", async () => {
      const challenge = createMockChallenge({ isActive: true });
      const participant = createMockParticipant({
        userId: "user-uuid-2",
        rank: 0,
      });

      vi.mocked(mockChallengeRepo.findOne!).mockResolvedValue(challenge);
      vi.mocked(mockParticipantRepo.findOne!).mockResolvedValue(null);
      vi.mocked(mockParticipantRepo.create!).mockReturnValue(participant);
      vi.mocked(mockParticipantRepo.save!).mockResolvedValue(participant);

      const result = await service.joinChallenge("user-uuid-2", "challenge-uuid-1");

      expect(mockParticipantRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          challengeId: "challenge-uuid-1",
          userId: "user-uuid-2",
          totalFocusMinutes: 0,
          sessionsCompleted: 0,
          rank: 0,
        }),
      );
      expect(result).toBeDefined();
    });

    it("should throw NotFoundException when challenge does not exist", async () => {
      vi.mocked(mockChallengeRepo.findOne!).mockResolvedValue(null);

      await expect(
        service.joinChallenge("user-uuid-2", "nonexistent-id"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when challenge is inactive", async () => {
      const inactiveChallenge = createMockChallenge({ isActive: false });
      vi.mocked(mockChallengeRepo.findOne!).mockResolvedValue(inactiveChallenge);

      await expect(
        service.joinChallenge("user-uuid-2", "challenge-uuid-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when user is already a participant", async () => {
      const challenge = createMockChallenge({ isActive: true });
      const existingParticipant = createMockParticipant({
        userId: "user-uuid-2",
      });

      vi.mocked(mockChallengeRepo.findOne!).mockResolvedValue(challenge);
      vi.mocked(mockParticipantRepo.findOne!).mockResolvedValue(
        existingParticipant,
      );

      await expect(
        service.joinChallenge("user-uuid-2", "challenge-uuid-1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getLeaderboard", () => {
    it("should return participants sorted by totalFocusMinutes descending with ranks", async () => {
      const challenge = createMockChallenge();
      const participants = [
        createMockParticipant({
          id: "p1",
          userId: "user-uuid-1",
          totalFocusMinutes: 120,
          sessionsCompleted: 4,
          user: { id: "user-uuid-1", displayName: "Alice" } as ChallengeParticipant["user"],
        }),
        createMockParticipant({
          id: "p2",
          userId: "user-uuid-2",
          totalFocusMinutes: 90,
          sessionsCompleted: 3,
          user: { id: "user-uuid-2", displayName: "Bob" } as ChallengeParticipant["user"],
        }),
        createMockParticipant({
          id: "p3",
          userId: "user-uuid-3",
          totalFocusMinutes: 60,
          sessionsCompleted: 2,
          user: { id: "user-uuid-3", displayName: "Charlie" } as ChallengeParticipant["user"],
        }),
      ];

      vi.mocked(mockChallengeRepo.findOne!).mockResolvedValue(challenge);
      vi.mocked(mockParticipantRepo.find!).mockResolvedValue(participants);

      const result = await service.getLeaderboard("challenge-uuid-1");

      expect(result).toHaveLength(3);
      expect(result[0]!.rank).toBe(1);
      expect(result[0]!.displayName).toBe("Alice");
      expect(result[0]!.totalFocusMinutes).toBe(120);
      expect(result[1]!.rank).toBe(2);
      expect(result[1]!.displayName).toBe("Bob");
      expect(result[2]!.rank).toBe(3);
      expect(result[2]!.displayName).toBe("Charlie");
    });

    it("should throw NotFoundException when challenge does not exist", async () => {
      vi.mocked(mockChallengeRepo.findOne!).mockResolvedValue(null);

      await expect(
        service.getLeaderboard("nonexistent-id"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should return empty array when challenge has no participants", async () => {
      const challenge = createMockChallenge();
      vi.mocked(mockChallengeRepo.findOne!).mockResolvedValue(challenge);
      vi.mocked(mockParticipantRepo.find!).mockResolvedValue([]);

      const result = await service.getLeaderboard("challenge-uuid-1");

      expect(result).toEqual([]);
    });
  });

  describe("updateParticipantStats", () => {
    it("should increment focus minutes and sessions for the participant", async () => {
      const participant = createMockParticipant({
        totalFocusMinutes: 30,
        sessionsCompleted: 1,
      });
      const updatedParticipant = createMockParticipant({
        totalFocusMinutes: 55,
        sessionsCompleted: 2,
      });

      vi.mocked(mockParticipantRepo.findOne!).mockResolvedValue(participant);
      vi.mocked(mockParticipantRepo.save!)
        .mockResolvedValueOnce(updatedParticipant)
        .mockResolvedValueOnce([updatedParticipant] as unknown as ChallengeParticipant);
      vi.mocked(mockParticipantRepo.find!).mockResolvedValue([updatedParticipant]);

      const result = await service.updateParticipantStats(
        "user-uuid-1",
        "challenge-uuid-1",
        25,
        1,
      );

      expect(participant.totalFocusMinutes).toBe(55);
      expect(participant.sessionsCompleted).toBe(2);
      expect(mockParticipantRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should throw NotFoundException when participant does not exist in the challenge", async () => {
      vi.mocked(mockParticipantRepo.findOne!).mockResolvedValue(null);

      await expect(
        service.updateParticipantStats(
          "unknown-user",
          "challenge-uuid-1",
          25,
          1,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getActiveChallenges", () => {
    it("should return only active challenges the user participates in", async () => {
      const activeChallenge = createMockChallenge({ isActive: true });
      const inactiveChallenge = createMockChallenge({
        id: "challenge-uuid-2",
        isActive: false,
      });

      const participants = [
        createMockParticipant({
          challengeId: "challenge-uuid-1",
          challenge: activeChallenge as ChallengeParticipant["challenge"],
        }),
        createMockParticipant({
          id: "p2",
          challengeId: "challenge-uuid-2",
          challenge: inactiveChallenge as ChallengeParticipant["challenge"],
        }),
      ];

      vi.mocked(mockParticipantRepo.find!).mockResolvedValue(participants);

      const result = await service.getActiveChallenges("user-uuid-1");

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("challenge-uuid-1");
      expect(result[0]!.isActive).toBe(true);
    });

    it("should return empty array when user has no active challenges", async () => {
      vi.mocked(mockParticipantRepo.find!).mockResolvedValue([]);

      const result = await service.getActiveChallenges("user-uuid-1");

      expect(result).toEqual([]);
    });
  });

  describe("getWeeklyReport", () => {
    it("should return weekly report data for all active challenges", async () => {
      const challenge = createMockChallenge({ title: "Sprint Challenge" });
      const participant = createMockParticipant({
        totalFocusMinutes: 180,
        sessionsCompleted: 6,
        challenge: challenge as ChallengeParticipant["challenge"],
      });

      const allParticipants = [
        createMockParticipant({
          userId: "user-uuid-1",
          totalFocusMinutes: 180,
        }),
        createMockParticipant({
          id: "p2",
          userId: "user-uuid-2",
          totalFocusMinutes: 120,
        }),
      ];

      vi.mocked(mockParticipantRepo.find!)
        .mockResolvedValueOnce([participant])
        .mockResolvedValueOnce(allParticipants);

      const result = await service.getWeeklyReport("user-uuid-1");

      expect(result).toHaveLength(1);
      expect(result[0]!.challengeTitle).toBe("Sprint Challenge");
      expect(result[0]!.totalFocusMinutes).toBe(180);
      expect(result[0]!.sessionsCompleted).toBe(6);
      expect(result[0]!.rank).toBe(1);
      expect(result[0]!.totalParticipants).toBe(2);
    });

    it("should return empty array when user has no active challenges", async () => {
      vi.mocked(mockParticipantRepo.find!).mockResolvedValue([]);

      const result = await service.getWeeklyReport("user-uuid-1");

      expect(result).toEqual([]);
    });
  });
});
