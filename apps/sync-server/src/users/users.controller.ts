import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { UsersService } from "./users.service";
import { ApiResponse, createSuccessResponse } from "../common/api-response";
import { User } from "./user.entity";

class RegisterUserBody {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsNotEmpty()
  tokenHash!: string;
}

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async register(@Body() body: RegisterUserBody): Promise<ApiResponse<User>> {
    const existing = await this.usersService.findByEmail(body.email);
    if (existing) {
      throw new ConflictException("A user with this email already exists");
    }

    const user = await this.usersService.create({
      email: body.email,
      displayName: body.displayName,
      tokenHash: body.tokenHash,
    });

    return createSuccessResponse(user);
  }

  @Get(":id")
  async findById(@Param("id") id: string): Promise<ApiResponse<User>> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return createSuccessResponse(user);
  }
}
