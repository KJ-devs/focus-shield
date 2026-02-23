import { Injectable, ConflictException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { UsersService } from "../users/users.service";
import { User } from "../users/user.entity";

export interface RegisterResult {
  user: User;
  token: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  static hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  static generateToken(): string {
    return randomBytes(32).toString("hex");
  }

  async register(
    email: string,
    displayName: string,
  ): Promise<RegisterResult> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException("A user with this email already exists");
    }

    const token = AuthService.generateToken();
    const tokenHash = AuthService.hashToken(token);

    const user = await this.usersService.create({
      email,
      displayName,
      tokenHash,
    });

    return { user, token };
  }

  async validateToken(token: string): Promise<User | null> {
    const tokenHash = AuthService.hashToken(token);
    const users = await this.usersService.findByTokenHash(tokenHash);
    return users;
  }
}
