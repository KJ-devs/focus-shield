import { describe, it, expect, beforeEach, vi } from "vitest";
import { UsersService, CreateUserDto } from "../users/users.service";
import { User } from "../users/user.entity";
import { Repository } from "typeorm";

function createMockRepository(): Partial<Repository<User>> {
  return {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };
}

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: "test-uuid-1234",
    email: "test@example.com",
    displayName: "Test User",
    tokenHash: "hashed-token-abc",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("UsersService", () => {
  let service: UsersService;
  let mockRepo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    service = new UsersService(mockRepo as Repository<User>);
  });

  describe("create", () => {
    it("should create a new user", async () => {
      const dto: CreateUserDto = {
        email: "new@example.com",
        displayName: "New User",
        tokenHash: "some-hash",
      };

      const createdUser = createMockUser({
        email: dto.email,
        displayName: dto.displayName,
        tokenHash: dto.tokenHash,
      });

      vi.mocked(mockRepo.create!).mockReturnValue(createdUser);
      vi.mocked(mockRepo.save!).mockResolvedValue(createdUser);

      const result = await service.create(dto);

      expect(mockRepo.create).toHaveBeenCalledWith({
        email: dto.email,
        displayName: dto.displayName,
        tokenHash: dto.tokenHash,
      });
      expect(mockRepo.save).toHaveBeenCalledWith(createdUser);
      expect(result.email).toBe(dto.email);
      expect(result.displayName).toBe(dto.displayName);
    });
  });

  describe("findByEmail", () => {
    it("should return a user when found", async () => {
      const user = createMockUser();
      vi.mocked(mockRepo.findOne!).mockResolvedValue(user);

      const result = await service.findByEmail("test@example.com");

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
      expect(result).toEqual(user);
    });

    it("should return null when user not found", async () => {
      vi.mocked(mockRepo.findOne!).mockResolvedValue(null);

      const result = await service.findByEmail("nonexistent@example.com");

      expect(result).toBeNull();
    });
  });

  describe("findById", () => {
    it("should return a user when found", async () => {
      const user = createMockUser();
      vi.mocked(mockRepo.findOne!).mockResolvedValue(user);

      const result = await service.findById("test-uuid-1234");

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: "test-uuid-1234" },
      });
      expect(result).toEqual(user);
    });

    it("should return null when user not found", async () => {
      vi.mocked(mockRepo.findOne!).mockResolvedValue(null);

      const result = await service.findById("nonexistent-uuid");

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("should update a user when found", async () => {
      const existingUser = createMockUser();
      const updatedUser = createMockUser({ displayName: "Updated Name" });

      vi.mocked(mockRepo.findOne!).mockResolvedValue(existingUser);
      vi.mocked(mockRepo.save!).mockResolvedValue(updatedUser);

      const result = await service.update("test-uuid-1234", {
        displayName: "Updated Name",
      });

      expect(result).toEqual(updatedUser);
    });

    it("should return null when user not found", async () => {
      vi.mocked(mockRepo.findOne!).mockResolvedValue(null);

      const result = await service.update("nonexistent-uuid", {
        displayName: "Updated Name",
      });

      expect(result).toBeNull();
    });
  });
});
