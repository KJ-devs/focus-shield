import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../users/user.entity";

@Entity("sync_sessions")
export class SyncSession {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "varchar", length: 255, name: "client_session_id" })
  clientSessionId!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "jsonb" })
  blocks!: Record<string, unknown>[];

  @Column({ type: "int", name: "lock_level" })
  lockLevel!: number;

  @Column({ type: "timestamptz", nullable: true, name: "completed_at" })
  completedAt!: Date | null;

  @Column({ type: "int", name: "total_focus_minutes" })
  totalFocusMinutes!: number;

  @Column({ type: "float", nullable: true, name: "focus_score" })
  focusScore!: number | null;

  @CreateDateColumn({ name: "synced_at" })
  syncedAt!: Date;
}
