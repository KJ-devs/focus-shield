import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { CoworkingService } from "../coworking/coworking.service";
import { CoworkingRoom } from "../coworking/coworking-room.entity";
import {
  CoworkingMember,
  type MemberStatus,
} from "../coworking/coworking-member.entity";
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

function createMockRoom(overrides: Partial<CoworkingRoom> = {}): CoworkingRoom {
  return {
    id: "room-uuid-1",
    name: "Morning Focus",
    hostId: "user-uuid-1",
    host: { id: "user-uuid-1", displayName: "Alice" } as CoworkingRoom["host"],
    isActive: true,
    inviteCode: "ABCD1234",
    createdAt: new Date("2026-02-23T10:00:00Z"),
    members: [],
    ...overrides,
  };
}

function createMockMember(
  overrides: Partial<CoworkingMember> = {},
): CoworkingMember {
  return {
    id: "member-uuid-1",
    roomId: "room-uuid-1",
    room: createMockRoom() as CoworkingMember["room"],
    userId: "user-uuid-1",
    user: { id: "user-uuid-1", displayName: "Alice" } as CoworkingMember["user"],
    status: "idle" as MemberStatus,
    currentSessionMinutes: null,
    sessionStartedAt: null,
    joinedAt: new Date("2026-02-23T10:00:00Z"),
    ...overrides,
  };
}

describe("CoworkingService", () => {
  let service: CoworkingService;
  let mockRoomRepo: ReturnType<typeof createMockRepository<CoworkingRoom>>;
  let mockMemberRepo: ReturnType<typeof createMockRepository<CoworkingMember>>;

  beforeEach(() => {
    mockRoomRepo = createMockRepository<CoworkingRoom>();
    mockMemberRepo = createMockRepository<CoworkingMember>();
    service = new CoworkingService(
      mockRoomRepo as Repository<CoworkingRoom>,
      mockMemberRepo as Repository<CoworkingMember>,
    );
  });

  describe("createRoom", () => {
    it("should create a room with a random invite code and add host as member", async () => {
      const mockRoom = createMockRoom();
      const mockMember = createMockMember();

      vi.mocked(mockRoomRepo.create!).mockReturnValue(mockRoom);
      vi.mocked(mockRoomRepo.save!).mockResolvedValue(mockRoom);
      vi.mocked(mockMemberRepo.create!).mockReturnValue(mockMember);
      vi.mocked(mockMemberRepo.save!).mockResolvedValue(mockMember);

      const result = await service.createRoom("user-uuid-1", "Morning Focus");

      expect(mockRoomRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Morning Focus",
          hostId: "user-uuid-1",
          isActive: true,
          inviteCode: expect.any(String) as string,
        }),
      );
      expect(mockRoomRepo.save).toHaveBeenCalled();
      expect(mockMemberRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: mockRoom.id,
          userId: "user-uuid-1",
          status: "idle",
        }),
      );
      expect(mockMemberRepo.save).toHaveBeenCalled();
      expect(result.id).toBe(mockRoom.id);
    });

    it("should throw BadRequestException when name is empty", async () => {
      await expect(
        service.createRoom("user-uuid-1", ""),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when name is whitespace only", async () => {
      await expect(
        service.createRoom("user-uuid-1", "   "),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("joinRoom", () => {
    it("should add a user as a member using the invite code", async () => {
      const room = createMockRoom({ isActive: true });
      const member = createMockMember({ userId: "user-uuid-2" });

      vi.mocked(mockRoomRepo.findOne!).mockResolvedValue(room);
      vi.mocked(mockMemberRepo.findOne!).mockResolvedValue(null);
      vi.mocked(mockMemberRepo.create!).mockReturnValue(member);
      vi.mocked(mockMemberRepo.save!).mockResolvedValue(member);

      const result = await service.joinRoom("user-uuid-2", "ABCD1234");

      expect(mockRoomRepo.findOne).toHaveBeenCalledWith({
        where: { inviteCode: "ABCD1234" },
      });
      expect(mockMemberRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: room.id,
          userId: "user-uuid-2",
          status: "idle",
        }),
      );
      expect(result).toBeDefined();
    });

    it("should throw NotFoundException when invite code is invalid", async () => {
      vi.mocked(mockRoomRepo.findOne!).mockResolvedValue(null);

      await expect(
        service.joinRoom("user-uuid-2", "INVALID1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when room is inactive", async () => {
      const inactiveRoom = createMockRoom({ isActive: false });
      vi.mocked(mockRoomRepo.findOne!).mockResolvedValue(inactiveRoom);

      await expect(
        service.joinRoom("user-uuid-2", "ABCD1234"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when user is already a member", async () => {
      const room = createMockRoom({ isActive: true });
      const existingMember = createMockMember({ userId: "user-uuid-2" });

      vi.mocked(mockRoomRepo.findOne!).mockResolvedValue(room);
      vi.mocked(mockMemberRepo.findOne!).mockResolvedValue(existingMember);

      await expect(
        service.joinRoom("user-uuid-2", "ABCD1234"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("leaveRoom", () => {
    it("should remove the member from the room", async () => {
      const member = createMockMember({ userId: "user-uuid-2" });

      vi.mocked(mockMemberRepo.findOne!).mockResolvedValue(member);
      vi.mocked(mockMemberRepo.remove!).mockResolvedValue(member);

      await service.leaveRoom("user-uuid-2", "room-uuid-1");

      expect(mockMemberRepo.findOne).toHaveBeenCalledWith({
        where: { roomId: "room-uuid-1", userId: "user-uuid-2" },
      });
      expect(mockMemberRepo.remove).toHaveBeenCalledWith(member);
    });

    it("should throw NotFoundException when user is not a member", async () => {
      vi.mocked(mockMemberRepo.findOne!).mockResolvedValue(null);

      await expect(
        service.leaveRoom("user-uuid-2", "room-uuid-1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateStatus", () => {
    it("should update the member status to focusing with session details", async () => {
      const member = createMockMember({ status: "idle" });
      const updatedMember = createMockMember({
        status: "focusing",
        currentSessionMinutes: 25,
      });

      vi.mocked(mockMemberRepo.findOne!).mockResolvedValue(member);
      vi.mocked(mockMemberRepo.save!).mockResolvedValue(updatedMember);

      const result = await service.updateStatus(
        "user-uuid-1",
        "room-uuid-1",
        "focusing",
        25,
      );

      expect(member.status).toBe("focusing");
      expect(member.currentSessionMinutes).toBe(25);
      expect(member.sessionStartedAt).toBeInstanceOf(Date);
      expect(mockMemberRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should clear session details when status changes to idle", async () => {
      const member = createMockMember({
        status: "focusing",
        currentSessionMinutes: 25,
        sessionStartedAt: new Date(),
      });
      const updatedMember = createMockMember({
        status: "idle",
        currentSessionMinutes: null,
        sessionStartedAt: null,
      });

      vi.mocked(mockMemberRepo.findOne!).mockResolvedValue(member);
      vi.mocked(mockMemberRepo.save!).mockResolvedValue(updatedMember);

      await service.updateStatus("user-uuid-1", "room-uuid-1", "idle");

      expect(member.status).toBe("idle");
      expect(member.currentSessionMinutes).toBeNull();
      expect(member.sessionStartedAt).toBeNull();
    });

    it("should throw NotFoundException when user is not a member", async () => {
      vi.mocked(mockMemberRepo.findOne!).mockResolvedValue(null);

      await expect(
        service.updateStatus("unknown-user", "room-uuid-1", "focusing"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getRoomMembers", () => {
    it("should return all members with their display names and statuses", async () => {
      const room = createMockRoom();
      const members = [
        createMockMember({
          userId: "user-uuid-1",
          status: "focusing",
          currentSessionMinutes: 25,
          sessionStartedAt: new Date("2026-02-23T10:00:00Z"),
          user: { id: "user-uuid-1", displayName: "Alice" } as CoworkingMember["user"],
        }),
        createMockMember({
          id: "member-uuid-2",
          userId: "user-uuid-2",
          status: "idle",
          user: { id: "user-uuid-2", displayName: "Bob" } as CoworkingMember["user"],
        }),
      ];

      vi.mocked(mockRoomRepo.findOne!).mockResolvedValue(room);
      vi.mocked(mockMemberRepo.find!).mockResolvedValue(members);

      const result = await service.getRoomMembers("room-uuid-1");

      expect(result).toHaveLength(2);
      expect(result[0]!.displayName).toBe("Alice");
      expect(result[0]!.status).toBe("focusing");
      expect(result[0]!.currentSessionMinutes).toBe(25);
      expect(result[1]!.displayName).toBe("Bob");
      expect(result[1]!.status).toBe("idle");
    });

    it("should throw NotFoundException when room does not exist", async () => {
      vi.mocked(mockRoomRepo.findOne!).mockResolvedValue(null);

      await expect(
        service.getRoomMembers("nonexistent-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getMyRooms", () => {
    it("should return only active rooms the user belongs to", async () => {
      const activeRoom = createMockRoom({ isActive: true });
      const inactiveRoom = createMockRoom({
        id: "room-uuid-2",
        isActive: false,
      });

      const memberships = [
        createMockMember({
          room: activeRoom as CoworkingMember["room"],
        }),
        createMockMember({
          id: "member-uuid-2",
          roomId: "room-uuid-2",
          room: inactiveRoom as CoworkingMember["room"],
        }),
      ];

      vi.mocked(mockMemberRepo.find!).mockResolvedValue(memberships);

      const result = await service.getMyRooms("user-uuid-1");

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("room-uuid-1");
      expect(result[0]!.isActive).toBe(true);
    });

    it("should return empty array when user has no rooms", async () => {
      vi.mocked(mockMemberRepo.find!).mockResolvedValue([]);

      const result = await service.getMyRooms("user-uuid-1");

      expect(result).toEqual([]);
    });
  });

  describe("startSyncSession", () => {
    it("should set all members to focusing status when host starts sync", async () => {
      const room = createMockRoom({ hostId: "user-uuid-1" });
      const members = [
        createMockMember({ userId: "user-uuid-1", status: "idle" }),
        createMockMember({
          id: "member-uuid-2",
          userId: "user-uuid-2",
          status: "idle",
        }),
      ];

      vi.mocked(mockRoomRepo.findOne!).mockResolvedValue(room);
      vi.mocked(mockMemberRepo.find!).mockResolvedValue(members);
      vi.mocked(mockMemberRepo.save!).mockResolvedValue(
        members as unknown as CoworkingMember,
      );

      const result = await service.startSyncSession("room-uuid-1", "user-uuid-1");

      expect(members[0]!.status).toBe("focusing");
      expect(members[0]!.sessionStartedAt).toBeInstanceOf(Date);
      expect(members[1]!.status).toBe("focusing");
      expect(members[1]!.sessionStartedAt).toBeInstanceOf(Date);
      expect(mockMemberRepo.save).toHaveBeenCalledWith(members);
      expect(result).toBeDefined();
    });

    it("should throw NotFoundException when room does not exist", async () => {
      vi.mocked(mockRoomRepo.findOne!).mockResolvedValue(null);

      await expect(
        service.startSyncSession("nonexistent-id", "user-uuid-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when non-host tries to start sync", async () => {
      const room = createMockRoom({ hostId: "user-uuid-1" });
      vi.mocked(mockRoomRepo.findOne!).mockResolvedValue(room);

      await expect(
        service.startSyncSession("room-uuid-1", "user-uuid-2"),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
