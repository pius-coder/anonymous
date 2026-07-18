import {
  MiniGameV1,
  NotificationV1,
  ParticipationV1,
  SessionV1,
} from "@session-jeu/contracts";
import {
  correlationId,
  dateToTimestamp,
  rpcCall,
  rpcClients,
} from "@/lib/rpc";

type MoneyInput = {
  currency: string;
  units: bigint | number;
  nanos?: number;
};

function money(input: MoneyInput) {
  return {
    currency: input.currency,
    units: BigInt(input.units),
    nanos: input.nanos ?? 0,
  };
}

/**
 * Façades frontend uniques pour tous les domaines RPC.
 * Les IDs d'acteur restent volontairement vides : l'API les dérive du cookie HTTP-only.
 */
export const SessionService = {
  list(pageSize = 24, pageToken = "") {
    return rpcCall(() => rpcClients.sessions.listParties({ pageSize, pageToken }));
  },
  get(partyId: string) {
    return rpcCall(() => rpcClients.sessions.getParty({ partyId: { value: partyId } }));
  },
  create(input: {
    name: string;
    description: string;
    minPlayers: number;
    maxPlayers: number;
    entryFee: MoneyInput;
    visibility: SessionV1.PartyVisibility;
    minigameIds: string[];
  }) {
    return rpcCall(() => rpcClients.sessions.createParty({
      correlationId: correlationId("party-create"),
      config: {
        name: input.name,
        description: input.description,
        minPlayers: input.minPlayers,
        maxPlayers: input.maxPlayers,
        entryFee: money(input.entryFee),
        visibility: input.visibility,
        selectedMinigameIds: input.minigameIds,
      },
    }));
  },
  schedule(partyId: string, scheduledStart: Date | string) {
    return rpcCall(() => rpcClients.sessions.scheduleParty({
      correlationId: correlationId("party-schedule"),
      partyId: { value: partyId },
      scheduledStart: dateToTimestamp(scheduledStart),
    }));
  },
};

export const ParticipationService = {
  join(partyId: string, role = ParticipationV1.ParticipationRole.PLAYER) {
    return rpcCall(() => rpcClients.participations.attachParticipation({
      correlationId: correlationId("participation-attach"),
      partyId: { value: partyId },
      role,
    }));
  },
  get(participationId: string) {
    return rpcCall(() => rpcClients.participations.getParticipation({ participationId }));
  },
  list(partyId: string) {
    return rpcCall(() => rpcClients.participations.listParticipations({
      partyId: { value: partyId },
    }));
  },
};

export const PreparationService = {
  open(partyId: string, announcementAt: Date | string) {
    return rpcCall(() => rpcClients.preparation.openPreparation({
      correlationId: correlationId("preparation-open"),
      partyId: { value: partyId },
      announcementAt: dateToTimestamp(announcementAt),
    }));
  },
  markReady(partyId: string) {
    return rpcCall(() => rpcClients.preparation.markReady({
      correlationId: correlationId("preparation-ready"),
      partyId: { value: partyId },
    }));
  },
  announce(partyId: string, title: string, body: string) {
    return rpcCall(() => rpcClients.preparation.sendAnnouncement({
      correlationId: correlationId("preparation-announce"),
      partyId: { value: partyId },
      title,
      body,
    }));
  },
  confirmStart(partyId: string) {
    return rpcCall(() => rpcClients.preparation.confirmStart({
      correlationId: correlationId("preparation-confirm"),
      partyId: { value: partyId },
    }));
  },
  getState(partyId: string) {
    return rpcCall(() => rpcClients.preparation.getPreparationState({
      partyId: { value: partyId },
    }));
  },
};

export const PaymentService = {
  topUp(amount: MoneyInput, provider: string) {
    return rpcCall(() => rpcClients.payments.processPayment({
      correlationId: correlationId("payment-topup"),
      amount: money(amount),
      provider,
    }));
  },
  transfer(amount: MoneyInput, destinationReference: string) {
    return rpcCall(() => rpcClients.payments.initiateTransfer({
      correlationId: correlationId("payment-transfer"),
      amount: money(amount),
      destinationReference,
    }));
  },
  getWallet() {
    return rpcCall(() => rpcClients.payments.getWallet({}));
  },
  history(pageSize = 30, pageToken = "") {
    return rpcCall(() => rpcClients.payments.getPaymentHistory({ pageSize, pageToken }));
  },
};

export const LiveAccessService = {
  create(partyId: string) {
    return rpcCall(() => rpcClients.realtime.createLiveAccess({
      correlationId: correlationId("live-access"),
      partyId: { value: partyId },
    }));
  },
  playerState(partyId: string) {
    return rpcCall(() => rpcClients.realtime.getPlayerState({ partyId: { value: partyId } }));
  },
  adminSnapshot(partyId: string) {
    return rpcCall(() => rpcClients.realtime.getAdminGameSnapshot({
      partyId: { value: partyId },
    }));
  },
  readonlySnapshot(partyId: string) {
    return rpcCall(() => rpcClients.realtime.getReadonlySnapshot({
      partyId: { value: partyId },
    }));
  },
};

export const MiniGameService = {
  list() {
    return rpcCall(() => rpcClients.minigames.listMiniGames({}));
  },
  get(minigameId: string) {
    return rpcCall(() => rpcClients.minigames.getMiniGame({ minigameId }));
  },
  familyLabel(family: MiniGameV1.MiniGameFamily) {
    return MiniGameV1.MiniGameFamily[family] ?? "UNSPECIFIED";
  },
};

export const ScoringService = {
  provisional(roundId: string) {
    return rpcCall(() => rpcClients.scoring.listProvisionalScores({ roundId }));
  },
  correct(roundId: string, playerId: string, correctedScore: number, reason: string) {
    return rpcCall(() => rpcClients.scoring.correctProvisionalScore({
      correlationId: correlationId("score-correct"),
      roundId,
      playerId: { value: playerId },
      correctedScore,
      reason,
    }));
  },
  publish(roundId: string, partyId: string) {
    return rpcCall(() => rpcClients.scoring.publishResults({
      correlationId: correlationId("score-publish"),
      roundId,
      partyId: { value: partyId },
    }));
  },
  published(partyId: string) {
    return rpcCall(() => rpcClients.scoring.getPublishedResults({
      partyId: { value: partyId },
    }));
  },
};

export const AdminService = {
  gameState(partyId: string) {
    return rpcCall(() => rpcClients.admin.getGameState({ partyId: { value: partyId } }));
  },
  readonlySnapshot(partyId: string) {
    return rpcCall(() => rpcClients.admin.getReadonlySnapshot({
      partyId: { value: partyId },
    }));
  },
  listParties(
    statusFilter = SessionV1.PartyStatus.UNSPECIFIED,
    pageSize = 30,
    pageToken = "",
  ) {
    return rpcCall(() => rpcClients.admin.listParties({
      statusFilter,
      pageSize,
      pageToken,
    }));
  },
};

export const NotificationService = {
  list(pageSize = 30, pageToken = "") {
    return rpcCall(() => rpcClients.notifications.listNotifications({ pageSize, pageToken }));
  },
  status(notificationId: string) {
    return rpcCall(() => rpcClients.notifications.getNotificationStatus({ notificationId }));
  },
  send(
    playerId: string,
    type: NotificationV1.NotifType,
    channel: NotificationV1.NotifChannel,
    title: string,
    body: string,
  ) {
    return rpcCall(() => rpcClients.notifications.sendNotification({
      correlationId: correlationId("notification-send"),
      playerId: { value: playerId },
      type,
      channel,
      title,
      body,
    }));
  },
};
