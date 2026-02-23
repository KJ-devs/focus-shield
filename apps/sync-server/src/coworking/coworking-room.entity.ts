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
import { CoworkingMember } from "./coworking-member.entity";

@Entity("coworking_rooms")
export class CoworkingRoom {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "uuid", name: "host_id" })
  hostId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "host_id" })
  host!: User;

  @Column({ type: "boolean", default: true, name: "is_active" })
  isActive!: boolean;

  @Column({ type: "varchar", length: 8, unique: true, name: "invite_code" })
  inviteCode!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @OneToMany(() => CoworkingMember, (m) => m.room)
  members!: CoworkingMember[];
}
