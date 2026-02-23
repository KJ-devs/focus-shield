import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../users/user.entity";
import { CoworkingRoom } from "./coworking-room.entity";

export type MemberStatus = "idle" | "focusing" | "break";

@Entity("coworking_members")
export class CoworkingMember {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "room_id" })
  roomId!: string;

  @ManyToOne(() => CoworkingRoom, (r) => r.members)
  @JoinColumn({ name: "room_id" })
  room!: CoworkingRoom;

  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "varchar", length: 20, default: "idle" })
  status!: MemberStatus;

  @Column({ type: "int", nullable: true, name: "current_session_minutes" })
  currentSessionMinutes!: number | null;

  @Column({ type: "timestamp", nullable: true, name: "session_started_at" })
  sessionStartedAt!: Date | null;

  @Column({ type: "timestamp", nullable: true, name: "joined_at" })
  joinedAt!: Date | null;
}
