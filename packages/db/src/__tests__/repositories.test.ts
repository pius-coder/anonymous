import { describe, expect, it } from "vitest";
import {
  userRepository,
  partyRepository,
  participationRepository,
  roundRepository,
  scoreRepository,
  auditRepository,
  paymentRepository,
  notificationRepository,
  announcementRepository,
  realtimeRepository,
} from "../repositories/index.js";

describe("L1 repository export surface", () => {
  it("exports userRepository functions", () => {
    expect(userRepository.createUser).toBeInstanceOf(Function);
    expect(userRepository.findUserById).toBeInstanceOf(Function);
    expect(userRepository.findUserByEmail).toBeInstanceOf(Function);
  });

  it("exports partyRepository functions", () => {
    expect(partyRepository.createParty).toBeInstanceOf(Function);
    expect(partyRepository.findPartyByCode).toBeInstanceOf(Function);
    expect(partyRepository.listParties).toBeInstanceOf(Function);
  });

  it("exports participationRepository functions", () => {
    expect(participationRepository.createParticipation).toBeInstanceOf(Function);
    expect(participationRepository.findParticipation).toBeInstanceOf(Function);
    expect(participationRepository.listParticipationsByParty).toBeInstanceOf(Function);
  });

  it("exports roundRepository functions", () => {
    expect(roundRepository.createRound).toBeInstanceOf(Function);
    expect(roundRepository.findRoundById).toBeInstanceOf(Function);
    expect(roundRepository.listRoundsByParty).toBeInstanceOf(Function);
    expect(roundRepository.findRoundByPartyNumber).toBeInstanceOf(Function);
    expect(roundRepository.updateRoundLifecycle).toBeInstanceOf(Function);
    expect(roundRepository.createOrUpdateRoundDeadline).toBeInstanceOf(Function);
    expect(roundRepository.updateRoundDeadline).toBeInstanceOf(Function);
    expect(roundRepository.findRoundDeadlineByRoundId).toBeInstanceOf(Function);
    expect(roundRepository.listDueRoundDeadlines).toBeInstanceOf(Function);
    expect(roundRepository.claimDueRoundDeadline).toBeInstanceOf(Function);
    expect(roundRepository.upsertRoundParticipantStatus).toBeInstanceOf(Function);
    expect(roundRepository.markRoundParticipantsWaitingReview).toBeInstanceOf(Function);
    expect(roundRepository.findPlayerActionByNonce).toBeInstanceOf(Function);
    expect(roundRepository.createPlayerAction).toBeInstanceOf(Function);
  });

  it("exports scoreRepository functions including ScoreReview", () => {
    expect(scoreRepository.createProvisionalScore).toBeInstanceOf(Function);
    expect(scoreRepository.listProvisionalScoresByRound).toBeInstanceOf(Function);
    expect(scoreRepository.publishScore).toBeInstanceOf(Function);
    expect(scoreRepository.createScoreReview).toBeInstanceOf(Function);
    expect(scoreRepository.listScoreReviewsByProvisional).toBeInstanceOf(Function);
    expect(scoreRepository.createScoreReviewAndUpdateProvisional).toBeInstanceOf(Function);
  });

  it("exports auditRepository functions", () => {
    expect(auditRepository.createAuditLog).toBeInstanceOf(Function);
    expect(auditRepository.listAuditLogs).toBeInstanceOf(Function);
  });

  it("exports announcementRepository (Announcement only)", () => {
    expect(announcementRepository.createAnnouncement).toBeInstanceOf(Function);
    expect(announcementRepository.findAnnouncementsByParty).toBeInstanceOf(Function);
  });

  it("exports notificationRepository job + DeliveryLog without Announcement", () => {
    expect(notificationRepository.createNotificationJob).toBeInstanceOf(Function);
    expect(notificationRepository.createDeliveryLog).toBeInstanceOf(Function);
    expect(notificationRepository.listDeliveryLogsByJob).toBeInstanceOf(Function);
    expect(notificationRepository.listDeliveryLogsByStatus).toBeInstanceOf(Function);
    expect(
      (notificationRepository as Record<string, unknown>).createAnnouncement,
    ).toBeUndefined();
  });

  it("exports paymentRepository functions", () => {
    expect(paymentRepository.createWallet).toBeInstanceOf(Function);
    expect(paymentRepository.findWalletByUserId).toBeInstanceOf(Function);
    expect(paymentRepository.createPaymentTransaction).toBeInstanceOf(Function);
    expect(paymentRepository.findTransactionByIdempotencyKey).toBeInstanceOf(Function);
    expect(paymentRepository.findLedgerEntryByIdempotencyKey).toBeInstanceOf(Function);
  });

  it("exports realtimeRepository functions", () => {
    expect(realtimeRepository.upsertConnection).toBeInstanceOf(Function);
    expect(realtimeRepository.findByTokenHash).toBeInstanceOf(Function);
    expect(realtimeRepository.markReconnectingByParticipation).toBeInstanceOf(Function);
    expect(realtimeRepository.markConnectedByParticipation).toBeInstanceOf(Function);
    expect(realtimeRepository.markDisconnectedByParticipation).toBeInstanceOf(Function);
  });
});
