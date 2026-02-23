import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { User } from "../users/user.entity";

@Entity("sync_configs")
export class SyncConfig {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "jsonb", name: "config_data" })
  configData!: Record<string, unknown>;

  @CreateDateColumn({ name: "synced_at" })
  syncedAt!: Date;
}
