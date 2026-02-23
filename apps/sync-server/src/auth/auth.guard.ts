import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;

    if (!authHeader) {
      throw new UnauthorizedException("Missing Authorization header");
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      throw new UnauthorizedException("Invalid Authorization header format");
    }

    const token = parts[1];
    if (!token) {
      throw new UnauthorizedException("Missing token");
    }

    const user = await this.authService.validateToken(token);
    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    request.user = user;
    return true;
  }
}
