import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Challenge } from "./challenge.entity";
import { ChallengeParticipant } from "./challenge-participant.entity";
import { ChallengeService } from "./challenge.service";
import { ChallengeController } from "./challenge.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Challenge, ChallengeParticipant]),
    AuthModule,
  ],
  controllers: [ChallengeController],
  providers: [ChallengeService],
  exports: [ChallengeService],
})
export class ChallengeModule {}
