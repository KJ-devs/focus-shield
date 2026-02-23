import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../users/user.entity";
import { Buddy } from "./buddy.entity";

export type BuddyNotificationType =
  | "override_used"
  | "streak_broken"
  | "session_completed"
  | "achievement_unlocked";

@Entity("buddy_notifications")
export class BuddyNotification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "buddy_pair_id" })
  buddyPairId!: string;

  @ManyToOne(() => Buddy)
  @JoinColumn({ name: "buddy_pair_id" })
  buddyPair!: Buddy;

  @Column({ type: "uuid", name: "from_user_id" })
  fromUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "from_user_id" })
  fromUser!: User;

  @Column({ type: "varchar", length: 50 })
  type!: BuddyNotificationType;

  @Column({ type: "varchar", length: 500 })
  message!: string;

  @Column({ type: "boolean", default: false })
  read!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
