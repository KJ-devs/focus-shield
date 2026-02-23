import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConflictException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { UsersService } from "../users/users.service";
import { User } from "../users/user.entity";

function createMockUsersService(): {
  findByEmail: ReturnType<typeof vi.fn>;
  findByTokenHash: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
} {
  return {
    findByEmail: vi.fn(),
    findByTokenHash: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
  };
}

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-uuid-1",
    email: "test@example.com",
    displayName: "Test User",
    tokenHash: "hashed-token-value",
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
    ...overrides,
  };
}

describe("AuthService", () => {
  let service: AuthService;
  let mockUsersService: ReturnType<typeof createMockUsersService>;

  beforeEach(() => {
    mockUsersService = createMockUsersService();
    service = new AuthService(mockUsersService as unknown as UsersService);
  });

  describe("generateToken", () => {
    it("should return a 64-character hex string", () => {
      const token = AuthService.generateToken();

      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it("should generate unique tokens on each call", () => {
      const token1 = AuthService.generateToken();
      const token2 = AuthService.generateToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe("hashToken", () => {
    it("should return a deterministic hash for the same input", () => {
      const token = "abc123def456";

      const hash1 = AuthService.hashToken(token);
      const hash2 = AuthService.hashToken(token);

      expect(hash1).toBe(hash2);
    });

    it("should return different hashes for different inputs", () => {
      const hash1 = AuthService.hashToken("token-a");
      const hash2 = AuthService.hashToken("token-b");

      expect(hash1).not.toBe(hash2);
    });

    it("should not return the original token", () => {
      const token = "my-secret-token";

      const hash = AuthService.hashToken(token);

      expect(hash).not.toBe(token);
    });
  });

  describe("register", () => {
    it("should create a user with a hashed token and return the plaintext token", async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      const createdUser = createMockUser();
      mockUsersService.create.mockResolvedValue(createdUser);

      const result = await service.register("test@example.com", "Test User");

      expect(result.user).toBe(createdUser);
      expect(result.token).toHaveLength(64);
      expect(result.token).toMatch(/^[a-f0-9]+$/);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: "test@example.com",
        displayName: "Test User",
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) as string,
      });
    });

    it("should throw ConflictException when email already exists", async () => {
      const existingUser = createMockUser();
      mockUsersService.findByEmail.mockResolvedValue(existingUser);

      await expect(
        service.register("test@example.com", "Test User"),
      ).rejects.toThrow(ConflictException);

      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it("should store a hash that matches the returned token", async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockImplementation(
        (dto: { email: string; displayName: string; tokenHash: string }) => {
          return Promise.resolve(
            createMockUser({ tokenHash: dto.tokenHash }),
          );
        },
      );

      const result = await service.register("test@example.com", "Test User");

      const expectedHash = AuthService.hashToken(result.token);
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ tokenHash: expectedHash }),
      );
    });
  });

  describe("validateToken", () => {
    it("should return the user for a valid token", async () => {
      const token = "valid-token-abc123";
      const tokenHash = AuthService.hashToken(token);
      const user = createMockUser({ tokenHash });
      mockUsersService.findByTokenHash.mockResolvedValue(user);

      const result = await service.validateToken(token);

      expect(result).toBe(user);
      expect(mockUsersService.findByTokenHash).toHaveBeenCalledWith(tokenHash);
    });

    it("should return null for an invalid token", async () => {
      mockUsersService.findByTokenHash.mockResolvedValue(null);

      const result = await service.validateToken("invalid-token");

      expect(result).toBeNull();
    });

    it("should hash the token before looking up the user", async () => {
      const token = "some-token";
      const expectedHash = AuthService.hashToken(token);
      mockUsersService.findByTokenHash.mockResolvedValue(null);

      await service.validateToken(token);

      expect(mockUsersService.findByTokenHash).toHaveBeenCalledWith(
        expectedHash,
      );
    });
  });
});
