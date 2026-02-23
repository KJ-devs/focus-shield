import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Buddy } from "./buddy.entity";
import { BuddyNotification } from "./buddy-notification.entity";
import { BuddyService } from "./buddy.service";
import { BuddyController } from "./buddy.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Buddy, BuddyNotification]),
    AuthModule,
  ],
  controllers: [BuddyController],
  providers: [BuddyService],
  exports: [BuddyService],
})
export class BuddyModule {}
