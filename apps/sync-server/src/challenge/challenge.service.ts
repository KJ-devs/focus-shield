import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Challenge } from "./challenge.entity";
import { ChallengeParticipant } from "./challenge-participant.entity";

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalFocusMinutes: number;
  sessionsCompleted: number;
  rank: number;
}

export interface WeeklyReport {
  totalFocusMinutes: number;
  sessionsCompleted: number;
  rank: number;
  totalParticipants: number;
  challengeTitle: string;
}

function getWeekBounds(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() + diffToMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

@Injectable()
export class ChallengeService {
  constructor(
    @InjectRepository(Challenge)
    private readonly challengeRepository: Repository<Challenge>,
    @InjectRepository(ChallengeParticipant)
    private readonly participantRepository: Repository<ChallengeParticipant>,
  ) {}

  async createChallenge(userId: string, title: string): Promise<Challenge> {
    if (!title.trim()) {
      throw new BadRequestException("Challenge title is required");
    }

    const { weekStart, weekEnd } = getWeekBounds();

    const challenge = this.challengeRepository.create({
      creatorId: userId,
      title: title.trim(),
      weekStart,
      weekEnd,
      isActive: true,
    });

    const savedChallenge = await this.challengeRepository.save(challenge);

    const participant = this.participantRepository.create({
      challengeId: savedChallenge.id,
      userId,
      totalFocusMinutes: 0,
      sessionsCompleted: 0,
      rank: 1,
      joinedAt: new Date(),
    });

    await this.participantRepository.save(participant);

    return savedChallenge;
  }

  async joinChallenge(userId: string, challengeId: string): Promise<ChallengeParticipant> {
    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException("Challenge not found");
    }

    if (!challenge.isActive) {
      throw new BadRequestException("Challenge is no longer active");
    }

    const existing = await this.participantRepository.findOne({
      where: { challengeId, userId },
    });

    if (existing) {
      throw new BadRequestException("Already joined this challenge");
    }

    const participant = this.participantRepository.create({
      challengeId,
      userId,
      totalFocusMinutes: 0,
      sessionsCompleted: 0,
      rank: 0,
      joinedAt: new Date(),
    });

    return this.participantRepository.save(participant);
  }

  async getLeaderboard(challengeId: string): Promise<LeaderboardEntry[]> {
    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException("Challenge not found");
    }

    const participants = await this.participantRepository.find({
      where: { challengeId },
      relations: ["user"],
      order: { totalFocusMinutes: "DESC" },
    });

    return participants.map((p, index) => ({
      userId: p.userId,
      displayName: p.user?.displayName ?? "Unknown",
      totalFocusMinutes: p.totalFocusMinutes,
      sessionsCompleted: p.sessionsCompleted,
      rank: index + 1,
    }));
  }

  async updateParticipantStats(
    userId: string,
    challengeId: string,
    focusMinutes: number,
    sessionsCompleted: number,
  ): Promise<ChallengeParticipant> {
    const participant = await this.participantRepository.findOne({
      where: { challengeId, userId },
    });

    if (!participant) {
      throw new NotFoundException("Participant not found in this challenge");
    }

    participant.totalFocusMinutes += focusMinutes;
    participant.sessionsCompleted += sessionsCompleted;

    const saved = await this.participantRepository.save(participant);

    // Recalculate ranks for all participants in the challenge
    const allParticipants = await this.participantRepository.find({
      where: { challengeId },
      order: { totalFocusMinutes: "DESC" },
    });

    for (let i = 0; i < allParticipants.length; i++) {
      const p = allParticipants[i]!;
      p.rank = i + 1;
    }

    await this.participantRepository.save(allParticipants);

    return saved;
  }

  async getActiveChallenges(userId: string): Promise<Challenge[]> {
    const participants = await this.participantRepository.find({
      where: { userId },
      relations: ["challenge", "challenge.participants", "challenge.participants.user"],
    });

    return participants
      .filter((p) => p.challenge?.isActive)
      .map((p) => p.challenge);
  }

  async getWeeklyReport(userId: string): Promise<WeeklyReport[]> {
    const participants = await this.participantRepository.find({
      where: { userId },
      relations: ["challenge"],
    });

    const activeParticipants = participants.filter((p) => p.challenge?.isActive);

    const reports: WeeklyReport[] = [];

    for (const participant of activeParticipants) {
      const allInChallenge = await this.participantRepository.find({
        where: { challengeId: participant.challengeId },
        order: { totalFocusMinutes: "DESC" },
      });

      const rankIndex = allInChallenge.findIndex((p) => p.userId === userId);

      reports.push({
        totalFocusMinutes: participant.totalFocusMinutes,
        sessionsCompleted: participant.sessionsCompleted,
        rank: rankIndex + 1,
        totalParticipants: allInChallenge.length,
        challengeTitle: participant.challenge.title,
      });
    }

    return reports;
  }
}
