import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CoworkingRoom } from "./coworking-room.entity";
import { CoworkingMember } from "./coworking-member.entity";
import { CoworkingService } from "./coworking.service";
import { CoworkingController } from "./coworking.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([CoworkingRoom, CoworkingMember]),
    AuthModule,
  ],
  controllers: [CoworkingController],
  providers: [CoworkingService],
  exports: [CoworkingService],
})
export class CoworkingModule {}
