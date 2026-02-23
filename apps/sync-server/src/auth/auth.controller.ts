import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Headers,
} from "@nestjs/common";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { AuthService } from "./auth.service";
import { ApiResponse, createSuccessResponse } from "../common/api-response";

class RegisterBody {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;
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

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(
    @Body() body: RegisterBody,
  ): Promise<ApiResponse<RegisterResponse>> {
    const result = await this.authService.register(
      body.email,
      body.displayName,
    );

    return createSuccessResponse({
      token: result.token,
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
      },
    });
  }

  @Post("login")
  async login(
    @Headers("authorization") authHeader?: string,
  ): Promise<ApiResponse<LoginResponse>> {
    const token = this.extractToken(authHeader);
    if (!token) {
      throw new UnauthorizedException("Missing or invalid Authorization header");
    }

    const user = await this.authService.validateToken(token);
    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    return createSuccessResponse({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  }

  private extractToken(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return null;
    }

    return parts[1] ?? null;
  }
}
