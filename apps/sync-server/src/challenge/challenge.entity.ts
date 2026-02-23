import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "../users/user.entity";
import { ChallengeParticipant } from "./challenge-participant.entity";

@Entity("challenges")
export class Challenge {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "creator_id" })
  creatorId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "creator_id" })
  creator!: User;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "timestamp", name: "week_start" })
  weekStart!: Date;

  @Column({ type: "timestamp", name: "week_end" })
  weekEnd!: Date;

  @Column({ type: "boolean", default: true, name: "is_active" })
  isActive!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @OneToMany(() => ChallengeParticipant, (p) => p.challenge)
  participants!: ChallengeParticipant[];
}
