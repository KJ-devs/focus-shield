import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Buddy } from "./buddy.entity";
import {
  BuddyNotification,
  type BuddyNotificationType,
} from "./buddy-notification.entity";

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

export interface BuddyWithUser {
  id: string;
  buddyUserId: string;
  buddyDisplayName: string;
  status: string;
  createdAt: Date;
}

export interface BuddyNotificationDto {
  id: string;
  buddyPairId: string;
  fromUserId: string;
  fromDisplayName: string;
  type: BuddyNotificationType;
  message: string;
  read: boolean;
  createdAt: Date;
}

@Injectable()
export class BuddyService {
  constructor(
    @InjectRepository(Buddy)
    private readonly buddyRepository: Repository<Buddy>,
    @InjectRepository(BuddyNotification)
    private readonly notificationRepository: Repository<BuddyNotification>,
  ) {}

  async createInvite(requesterId: string): Promise<Buddy> {
    const inviteCode = generateInviteCode();

    const buddy = this.buddyRepository.create({
      requesterId,
      responderId: null,
      status: "pending",
      inviteCode,
    });

    return this.buddyRepository.save(buddy);
  }

  async acceptInvite(inviteCode: string, responderId: string): Promise<Buddy> {
    const buddy = await this.buddyRepository.findOne({
      where: { inviteCode },
    });

    if (!buddy) {
      throw new NotFoundException("Invite not found");
    }

    if (buddy.status !== "pending") {
      throw new BadRequestException("Invite is no longer pending");
    }

    if (buddy.requesterId === responderId) {
      throw new BadRequestException("Cannot accept your own invite");
    }

    buddy.responderId = responderId;
    buddy.status = "accepted";

    return this.buddyRepository.save(buddy);
  }

  async declineInvite(
    inviteCode: string,
    responderId: string,
  ): Promise<Buddy> {
    const buddy = await this.buddyRepository.findOne({
      where: { inviteCode },
    });

    if (!buddy) {
      throw new NotFoundException("Invite not found");
    }

    if (buddy.status !== "pending") {
      throw new BadRequestException("Invite is no longer pending");
    }

    if (buddy.requesterId === responderId) {
      throw new BadRequestException("Cannot decline your own invite");
    }

    buddy.responderId = responderId;
    buddy.status = "declined";

    return this.buddyRepository.save(buddy);
  }

  async getBuddies(userId: string): Promise<BuddyWithUser[]> {
    const buddies = await this.buddyRepository.find({
      where: [
        { requesterId: userId, status: "accepted" },
        { responderId: userId, status: "accepted" },
      ],
      relations: ["requester", "responder"],
    });

    return buddies.map((buddy) => {
      const isRequester = buddy.requesterId === userId;
      const otherUser = isRequester ? buddy.responder : buddy.requester;

      return {
        id: buddy.id,
        buddyUserId: otherUser?.id ?? "",
        buddyDisplayName: otherUser?.displayName ?? "Unknown",
        status: buddy.status,
        createdAt: buddy.createdAt,
      };
    });
  }

  async sendNotification(
    buddyPairId: string,
    fromUserId: string,
    type: BuddyNotificationType,
    message: string,
  ): Promise<BuddyNotification> {
    const buddy = await this.buddyRepository.findOne({
      where: { id: buddyPairId },
    });

    if (!buddy) {
      throw new NotFoundException("Buddy pair not found");
    }

    if (buddy.status !== "accepted") {
      throw new BadRequestException("Buddy pair is not accepted");
    }

    const notification = this.notificationRepository.create({
      buddyPairId,
      fromUserId,
      type,
      message,
      read: false,
    });

    return this.notificationRepository.save(notification);
  }

  async getNotifications(
    userId: string,
    unreadOnly: boolean = false,
  ): Promise<BuddyNotificationDto[]> {
    const buddies = await this.buddyRepository.find({
      where: [
        { requesterId: userId, status: "accepted" },
        { responderId: userId, status: "accepted" },
      ],
    });

    if (buddies.length === 0) {
      return [];
    }

    const buddyIds = buddies.map((b) => b.id);

    const whereClause: Record<string, unknown> = {
      buddyPairId: In(buddyIds),
    };

    if (unreadOnly) {
      whereClause["read"] = false;
    }

    const notifications = await this.notificationRepository.find({
      where: whereClause,
      relations: ["fromUser"],
      order: { createdAt: "DESC" },
    });

    return notifications
      .filter((n) => n.fromUserId !== userId)
      .map((n) => ({
        id: n.id,
        buddyPairId: n.buddyPairId,
        fromUserId: n.fromUserId,
        fromDisplayName: n.fromUser?.displayName ?? "Unknown",
        type: n.type,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt,
      }));
  }

  async markNotificationRead(
    notificationId: string,
    userId: string,
  ): Promise<BuddyNotification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
      relations: ["buddyPair"],
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    const buddy = notification.buddyPair;
    if (buddy.requesterId !== userId && buddy.responderId !== userId) {
      throw new ForbiddenException("Not authorized to access this notification");
    }

    notification.read = true;
    return this.notificationRepository.save(notification);
  }

  async removeBuddy(buddyPairId: string, userId: string): Promise<void> {
    const buddy = await this.buddyRepository.findOne({
      where: { id: buddyPairId },
    });

    if (!buddy) {
      throw new NotFoundException("Buddy pair not found");
    }

    if (buddy.requesterId !== userId && buddy.responderId !== userId) {
      throw new ForbiddenException("Not authorized to remove this buddy");
    }

    await this.buddyRepository.remove(buddy);
  }
}
