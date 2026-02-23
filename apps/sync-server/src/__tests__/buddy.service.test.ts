import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { BuddyService } from "../buddy/buddy.service";
import { Buddy, type BuddyStatus } from "../buddy/buddy.entity";
import { BuddyNotification } from "../buddy/buddy-notification.entity";
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

function createMockBuddy(overrides: Partial<Buddy> = {}): Buddy {
  return {
    id: "buddy-uuid-1",
    requesterId: "user-uuid-1",
    requester: { id: "user-uuid-1", displayName: "Alice" } as Buddy["requester"],
    responderId: null,
    responder: null,
    status: "pending" as BuddyStatus,
    inviteCode: "ABC12345",
    createdAt: new Date("2026-02-20T10:00:00Z"),
    updatedAt: new Date("2026-02-20T10:00:00Z"),
    ...overrides,
  };
}

function createMockNotification(
  overrides: Partial<BuddyNotification> = {},
): BuddyNotification {
  return {
    id: "notif-uuid-1",
    buddyPairId: "buddy-uuid-1",
    buddyPair: createMockBuddy({
      id: "buddy-uuid-1",
      status: "accepted",
      requesterId: "user-uuid-1",
      responderId: "user-uuid-2",
    }) as BuddyNotification["buddyPair"],
    fromUserId: "user-uuid-2",
    fromUser: {
      id: "user-uuid-2",
      displayName: "Bob",
    } as BuddyNotification["fromUser"],
    type: "session_completed",
    message: "Bob completed a focus session!",
    read: false,
    createdAt: new Date("2026-02-20T12:00:00Z"),
    ...overrides,
  };
}

describe("BuddyService", () => {
  let service: BuddyService;
  let mockBuddyRepo: ReturnType<typeof createMockRepository<Buddy>>;
  let mockNotifRepo: ReturnType<
    typeof createMockRepository<BuddyNotification>
  >;

  beforeEach(() => {
    mockBuddyRepo = createMockRepository<Buddy>();
    mockNotifRepo = createMockRepository<BuddyNotification>();
    service = new BuddyService(
      mockBuddyRepo as Repository<Buddy>,
      mockNotifRepo as Repository<BuddyNotification>,
    );
  });

  describe("createInvite", () => {
    it("should generate a unique invite code and create a pending buddy record", async () => {
      const mockBuddy = createMockBuddy();
      vi.mocked(mockBuddyRepo.create!).mockReturnValue(mockBuddy);
      vi.mocked(mockBuddyRepo.save!).mockResolvedValue(mockBuddy);

      const result = await service.createInvite("user-uuid-1");

      expect(mockBuddyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requesterId: "user-uuid-1",
          responderId: null,
          status: "pending",
          inviteCode: expect.any(String) as string,
        }),
      );
      expect(mockBuddyRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.status).toBe("pending");
    });
  });

  describe("acceptInvite", () => {
    it("should change status to accepted when invite is pending", async () => {
      const pendingBuddy = createMockBuddy({ status: "pending" });
      const acceptedBuddy = createMockBuddy({
        status: "accepted",
        responderId: "user-uuid-2",
      });

      vi.mocked(mockBuddyRepo.findOne!).mockResolvedValue(pendingBuddy);
      vi.mocked(mockBuddyRepo.save!).mockResolvedValue(acceptedBuddy);

      const result = await service.acceptInvite("ABC12345", "user-uuid-2");

      expect(mockBuddyRepo.findOne).toHaveBeenCalledWith({
        where: { inviteCode: "ABC12345" },
      });
      expect(pendingBuddy.responderId).toBe("user-uuid-2");
      expect(pendingBuddy.status).toBe("accepted");
      expect(mockBuddyRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should throw NotFoundException for a non-existent invite code", async () => {
      vi.mocked(mockBuddyRepo.findOne!).mockResolvedValue(null);

      await expect(
        service.acceptInvite("INVALID1", "user-uuid-2"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for an already accepted invite", async () => {
      const acceptedBuddy = createMockBuddy({
        status: "accepted",
        responderId: "user-uuid-2",
      });
      vi.mocked(mockBuddyRepo.findOne!).mockResolvedValue(acceptedBuddy);

      await expect(
        service.acceptInvite("ABC12345", "user-uuid-3"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when user tries to accept own invite", async () => {
      const pendingBuddy = createMockBuddy({
        status: "pending",
        requesterId: "user-uuid-1",
      });
      vi.mocked(mockBuddyRepo.findOne!).mockResolvedValue(pendingBuddy);

      await expect(
        service.acceptInvite("ABC12345", "user-uuid-1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("declineInvite", () => {
    it("should change status to declined when invite is pending", async () => {
      const pendingBuddy = createMockBuddy({ status: "pending" });
      const declinedBuddy = createMockBuddy({
        status: "declined",
        responderId: "user-uuid-2",
      });

      vi.mocked(mockBuddyRepo.findOne!).mockResolvedValue(pendingBuddy);
      vi.mocked(mockBuddyRepo.save!).mockResolvedValue(declinedBuddy);

      const result = await service.declineInvite("ABC12345", "user-uuid-2");

      expect(pendingBuddy.status).toBe("declined");
      expect(pendingBuddy.responderId).toBe("user-uuid-2");
      expect(mockBuddyRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should throw NotFoundException for a non-existent code", async () => {
      vi.mocked(mockBuddyRepo.findOne!).mockResolvedValue(null);

      await expect(
        service.declineInvite("INVALID1", "user-uuid-2"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getBuddies", () => {
    it("should return only accepted buddy pairs for a user", async () => {
      const buddy1 = createMockBuddy({
        id: "buddy-1",
        requesterId: "user-uuid-1",
        responderId: "user-uuid-2",
        status: "accepted",
        responder: {
          id: "user-uuid-2",
          displayName: "Bob",
        } as Buddy["responder"],
      });
      const buddy2 = createMockBuddy({
        id: "buddy-2",
        requesterId: "user-uuid-3",
        responderId: "user-uuid-1",
        status: "accepted",
        requester: {
          id: "user-uuid-3",
          displayName: "Charlie",
        } as Buddy["requester"],
      });

      vi.mocked(mockBuddyRepo.find!).mockResolvedValue([buddy1, buddy2]);

      const result = await service.getBuddies("user-uuid-1");

      expect(mockBuddyRepo.find).toHaveBeenCalledWith({
        where: [
          { requesterId: "user-uuid-1", status: "accepted" },
          { responderId: "user-uuid-1", status: "accepted" },
        ],
        relations: ["requester", "responder"],
      });
      expect(result).toHaveLength(2);
      expect(result[0]!.buddyDisplayName).toBe("Bob");
      expect(result[1]!.buddyDisplayName).toBe("Charlie");
    });

    it("should return empty array when user has no accepted buddies", async () => {
      vi.mocked(mockBuddyRepo.find!).mockResolvedValue([]);

      const result = await service.getBuddies("user-uuid-1");

      expect(result).toEqual([]);
    });
  });

  describe("sendNotification", () => {
    it("should create a notification record for an accepted buddy pair", async () => {
      const buddy = createMockBuddy({
        id: "buddy-uuid-1",
        status: "accepted",
      });
      const notification = createMockNotification();

      vi.mocked(mockBuddyRepo.findOne!).mockResolvedValue(buddy);
      vi.mocked(mockNotifRepo.create!).mockReturnValue(notification);
      vi.mocked(mockNotifRepo.save!).mockResolvedValue(notification);

      const result = await service.sendNotification(
        "buddy-uuid-1",
        "user-uuid-2",
        "session_completed",
        "Bob completed a focus session!",
      );

      expect(mockNotifRepo.create).toHaveBeenCalledWith({
        buddyPairId: "buddy-uuid-1",
        fromUserId: "user-uuid-2",
        type: "session_completed",
        message: "Bob completed a focus session!",
        read: false,
      });
      expect(mockNotifRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should throw NotFoundException for non-existent buddy pair", async () => {
      vi.mocked(mockBuddyRepo.findOne!).mockResolvedValue(null);

      await expect(
        service.sendNotification(
          "invalid-id",
          "user-uuid-2",
          "session_completed",
          "Test",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when buddy pair is not accepted", async () => {
      const pendingBuddy = createMockBuddy({ status: "pending" });
      vi.mocked(mockBuddyRepo.findOne!).mockResolvedValue(pendingBuddy);

      await expect(
        service.sendNotification(
          "buddy-uuid-1",
          "user-uuid-2",
          "session_completed",
          "Test",
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getNotifications", () => {
    it("should return notifications for a user from their buddy pairs", async () => {
      const buddy = createMockBuddy({
        id: "buddy-uuid-1",
        requesterId: "user-uuid-1",
        responderId: "user-uuid-2",
        status: "accepted",
      });

      const notification = createMockNotification({
        fromUserId: "user-uuid-2",
        fromUser: {
          id: "user-uuid-2",
          displayName: "Bob",
        } as BuddyNotification["fromUser"],
      });

      vi.mocked(mockBuddyRepo.find!).mockResolvedValue([buddy]);
      vi.mocked(mockNotifRepo.find!).mockResolvedValue([notification]);

      const result = await service.getNotifications("user-uuid-1");

      expect(result).toHaveLength(1);
      expect(result[0]!.fromDisplayName).toBe("Bob");
      expect(result[0]!.type).toBe("session_completed");
    });

    it("should return empty array when user has no buddies", async () => {
      vi.mocked(mockBuddyRepo.find!).mockResolvedValue([]);

      const result = await service.getNotifications("user-uuid-1");

      expect(result).toEqual([]);
      expect(mockNotifRepo.find).not.toHaveBeenCalled();
    });
  });

  describe("markNotificationRead", () => {
    it("should update the read status of a notification", async () => {
      const notification = createMockNotification({
        read: false,
      });
      const updatedNotification = createMockNotification({ read: true });

      vi.mocked(mockNotifRepo.findOne!).mockResolvedValue(notification);
      vi.mocked(mockNotifRepo.save!).mockResolvedValue(updatedNotification);

      const result = await service.markNotificationRead(
        "notif-uuid-1",
        "user-uuid-1",
      );

      expect(notification.read).toBe(true);
      expect(mockNotifRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should throw NotFoundException for non-existent notification", async () => {
      vi.mocked(mockNotifRepo.findOne!).mockResolvedValue(null);

      await expect(
        service.markNotificationRead("invalid-id", "user-uuid-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user is not part of the buddy pair", async () => {
      const notification = createMockNotification({
        buddyPair: createMockBuddy({
          requesterId: "user-uuid-1",
          responderId: "user-uuid-2",
        }) as BuddyNotification["buddyPair"],
      });

      vi.mocked(mockNotifRepo.findOne!).mockResolvedValue(notification);

      await expect(
        service.markNotificationRead("notif-uuid-1", "user-uuid-99"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("removeBuddy", () => {
    it("should delete the buddy relationship when user is part of the pair", async () => {
      const buddy = createMockBuddy({
        requesterId: "user-uuid-1",
        responderId: "user-uuid-2",
        status: "accepted",
      });

      vi.mocked(mockBuddyRepo.findOne!).mockResolvedValue(buddy);
      vi.mocked(mockBuddyRepo.remove!).mockResolvedValue(buddy);

      await service.removeBuddy("buddy-uuid-1", "user-uuid-1");

      expect(mockBuddyRepo.remove).toHaveBeenCalledWith(buddy);
    });

    it("should throw NotFoundException for non-existent buddy pair", async () => {
      vi.mocked(mockBuddyRepo.findOne!).mockResolvedValue(null);

      await expect(
        service.removeBuddy("invalid-id", "user-uuid-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user is not part of the pair", async () => {
      const buddy = createMockBuddy({
        requesterId: "user-uuid-1",
        responderId: "user-uuid-2",
      });

      vi.mocked(mockBuddyRepo.findOne!).mockResolvedValue(buddy);

      await expect(
        service.removeBuddy("buddy-uuid-1", "user-uuid-99"),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
