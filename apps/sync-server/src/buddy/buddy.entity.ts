import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { User } from "../users/user.entity";

export type BuddyStatus = "pending" | "accepted" | "declined";

@Entity("buddies")
@Unique(["requesterId", "responderId"])
export class Buddy {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "requester_id" })
  requesterId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "requester_id" })
  requester!: User;

  @Column({ type: "uuid", name: "responder_id", nullable: true })
  responderId!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "responder_id" })
  responder!: User | null;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status!: BuddyStatus;

  @Column({ type: "varchar", length: 8, unique: true, name: "invite_code" })
  inviteCode!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
