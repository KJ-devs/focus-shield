import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CoworkingRoom } from "./coworking-room.entity";
import { CoworkingMember, type MemberStatus } from "./coworking-member.entity";

const INVITE_CODE_LENGTH = 8;
const INVITE_CODE_CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    const index = Math.floor(Math.random() * INVITE_CODE_CHARSET.length);
    code += INVITE_CODE_CHARSET[index];
  }
  return code;
}

export interface RoomMemberDto {
  userId: string;
  displayName: string;
  status: MemberStatus;
  currentSessionMinutes: number | null;
  sessionStartedAt: string | null;
}

@Injectable()
export class CoworkingService {
  constructor(
    @InjectRepository(CoworkingRoom)
    private readonly roomRepository: Repository<CoworkingRoom>,
    @InjectRepository(CoworkingMember)
    private readonly memberRepository: Repository<CoworkingMember>,
  ) {}

  async createRoom(userId: string, name: string): Promise<CoworkingRoom> {
    if (!name.trim()) {
      throw new BadRequestException("Room name is required");
    }

    const inviteCode = generateInviteCode();

    const room = this.roomRepository.create({
      name: name.trim(),
      hostId: userId,
      isActive: true,
      inviteCode,
    });

    const savedRoom = await this.roomRepository.save(room);

    const member = this.memberRepository.create({
      roomId: savedRoom.id,
      userId,
      status: "idle",
      currentSessionMinutes: null,
      sessionStartedAt: null,
      joinedAt: new Date(),
    });

    await this.memberRepository.save(member);

    return savedRoom;
  }

  async joinRoom(userId: string, inviteCode: string): Promise<CoworkingMember> {
    const room = await this.roomRepository.findOne({
      where: { inviteCode },
    });

    if (!room) {
      throw new NotFoundException("Room not found");
    }

    if (!room.isActive) {
      throw new BadRequestException("Room is no longer active");
    }

    const existing = await this.memberRepository.findOne({
      where: { roomId: room.id, userId },
    });

    if (existing) {
      throw new BadRequestException("Already a member of this room");
    }

    const member = this.memberRepository.create({
      roomId: room.id,
      userId,
      status: "idle",
      currentSessionMinutes: null,
      sessionStartedAt: null,
      joinedAt: new Date(),
    });

    return this.memberRepository.save(member);
  }

  async leaveRoom(userId: string, roomId: string): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { roomId, userId },
    });

    if (!member) {
      throw new NotFoundException("Not a member of this room");
    }

    await this.memberRepository.remove(member);
  }

  async updateStatus(
    userId: string,
    roomId: string,
    status: MemberStatus,
    sessionMinutes?: number,
  ): Promise<CoworkingMember> {
    const member = await this.memberRepository.findOne({
      where: { roomId, userId },
    });

    if (!member) {
      throw new NotFoundException("Not a member of this room");
    }

    member.status = status;

    if (status === "focusing") {
      member.currentSessionMinutes = sessionMinutes ?? null;
      member.sessionStartedAt = new Date();
    } else if (status === "idle") {
      member.currentSessionMinutes = null;
      member.sessionStartedAt = null;
    }

    return this.memberRepository.save(member);
  }

  async getRoomMembers(roomId: string): Promise<RoomMemberDto[]> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException("Room not found");
    }

    const members = await this.memberRepository.find({
      where: { roomId },
      relations: ["user"],
    });

    return members.map((m) => ({
      userId: m.userId,
      displayName: m.user?.displayName ?? "Unknown",
      status: m.status,
      currentSessionMinutes: m.currentSessionMinutes,
      sessionStartedAt: m.sessionStartedAt?.toISOString() ?? null,
    }));
  }

  async getMyRooms(userId: string): Promise<CoworkingRoom[]> {
    const memberships = await this.memberRepository.find({
      where: { userId },
      relations: ["room", "room.members", "room.members.user"],
    });

    return memberships
      .filter((m) => m.room?.isActive)
      .map((m) => m.room);
  }

  async startSyncSession(
    roomId: string,
    hostId: string,
  ): Promise<CoworkingMember[]> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException("Room not found");
    }

    if (room.hostId !== hostId) {
      throw new ForbiddenException("Only the host can start a synchronized session");
    }

    const members = await this.memberRepository.find({
      where: { roomId },
    });

    const now = new Date();
    for (const member of members) {
      member.status = "focusing";
      member.sessionStartedAt = now;
    }

    return this.memberRepository.save(members);
  }
}
