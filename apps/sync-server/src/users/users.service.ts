import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./user.entity";

export interface CreateUserDto {
  email: string;
  displayName: string;
  tokenHash: string;
}

export interface UpdateUserDto {
  displayName?: string;
  tokenHash?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create({
      email: dto.email,
      displayName: dto.displayName,
      tokenHash: dto.tokenHash,
    });
    return this.userRepository.save(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) {
      return null;
    }

    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName;
    }
    if (dto.tokenHash !== undefined) {
      user.tokenHash = dto.tokenHash;
    }

    return this.userRepository.save(user);
  }
}
