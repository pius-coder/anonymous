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
} from "../repositories/index.js";

describe("repository exports", () => {
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
  });

  it("exports scoreRepository functions", () => {
    expect(scoreRepository.createProvisionalScore).toBeInstanceOf(Function);
    expect(scoreRepository.listProvisionalScoresByRound).toBeInstanceOf(Function);
    expect(scoreRepository.publishScore).toBeInstanceOf(Function);
  });

  it("exports auditRepository functions", () => {
    expect(auditRepository.createAuditLog).toBeInstanceOf(Function);
    expect(auditRepository.listAuditLogs).toBeInstanceOf(Function);
  });

  it("exports notificationRepository functions", () => {
    expect(notificationRepository.createAnnouncement).toBeInstanceOf(Function);
    expect(notificationRepository.createNotificationJob).toBeInstanceOf(Function);
  });

  it("exports paymentRepository functions", () => {
    expect(paymentRepository.createWallet).toBeInstanceOf(Function);
    expect(paymentRepository.findWalletByUserId).toBeInstanceOf(Function);
    expect(paymentRepository.createPaymentTransaction).toBeInstanceOf(Function);
  });
});
