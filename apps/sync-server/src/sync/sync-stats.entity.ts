import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { User } from "../users/user.entity";

@Entity("sync_stats")
@Unique("UQ_sync_stats_user_date", ["userId", "date"])
export class SyncStats {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "varchar", length: 10 })
  date!: string;

  @Column({ type: "int", name: "total_focus_minutes" })
  totalFocusMinutes!: number;

  @Column({ type: "int", name: "sessions_completed" })
  sessionsCompleted!: number;

  @Column({ type: "int", name: "distraction_attempts" })
  distractionAttempts!: number;

  @Column({ type: "float", name: "average_focus_score" })
  averageFocusScore!: number;

  @CreateDateColumn({ name: "synced_at" })
  syncedAt!: Date;
}
