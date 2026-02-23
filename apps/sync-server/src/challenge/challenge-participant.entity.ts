import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../users/user.entity";
import { Challenge } from "./challenge.entity";

@Entity("challenge_participants")
export class ChallengeParticipant {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "challenge_id" })
  challengeId!: string;

  @ManyToOne(() => Challenge, (c) => c.participants)
  @JoinColumn({ name: "challenge_id" })
  challenge!: Challenge;

  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "int", default: 0, name: "total_focus_minutes" })
  totalFocusMinutes!: number;

  @Column({ type: "int", default: 0, name: "sessions_completed" })
  sessionsCompleted!: number;

  @Column({ type: "int", default: 0 })
  rank!: number;

  @Column({ type: "timestamp", nullable: true, name: "joined_at" })
  joinedAt!: Date | null;
}
