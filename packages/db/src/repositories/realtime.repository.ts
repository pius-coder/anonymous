import type { RealtimeConnection } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { CreateRealtimeConnectionData, RealtimeConnectionWithParticipation } from "./types.js";

export function createConnection(data: CreateRealtimeConnectionData): Promise<RealtimeConnection> {
  return prisma.realtimeConnection.create({ data });
}

export function upsertConnection(
  participationId: string,
  data: CreateRealtimeConnectionData,
): Promise<RealtimeConnection> {
  return prisma.realtimeConnection.upsert({
    where: { participationId },
    create: data,
    update: {
      connectionId: data.connectionId,
      state: data.state,
      tokenHash: data.tokenHash,
      tokenExpiresAt: data.tokenExpiresAt,
      connectedAt: new Date(),
      disconnectedAt: null,
    },
  });
}

export function findByTokenHash(tokenHash: string): Promise<RealtimeConnectionWithParticipation | null> {
  return prisma.realtimeConnection.findUnique({
    where: { tokenHash },
    include: {
      participation: {
        select: { id: true, partyId: true, userId: true, role: true, status: true },
      },
    },
  }) as Promise<RealtimeConnectionWithParticipation | null>;
}

export function findByParticipation(participationId: string): Promise<RealtimeConnection | null> {
  return prisma.realtimeConnection.findUnique({
    where: { participationId },
  });
}

export function findByConnectionId(connectionId: string): Promise<RealtimeConnection | null> {
  return prisma.realtimeConnection.findUnique({
    where: { connectionId },
  });
}

export function updateConnectionState(
  id: string,
  state: string,
): Promise<RealtimeConnection> {
  return prisma.realtimeConnection.update({
    where: { id },
    data: { state },
  });
}

export function markDisconnected(id: string): Promise<RealtimeConnection> {
  return prisma.realtimeConnection.update({
    where: { id },
    data: { state: "disconnected", disconnectedAt: new Date() },
  });
}

export function markReconnectingByParticipation(participationId: string): Promise<RealtimeConnection> {
  return prisma.realtimeConnection.update({
    where: { participationId },
    data: { state: "reconnecting", disconnectedAt: new Date() },
  });
}

export function markConnectedByParticipation(participationId: string): Promise<RealtimeConnection> {
  return prisma.realtimeConnection.update({
    where: { participationId },
    data: { state: "connected", connectedAt: new Date(), disconnectedAt: null },
  });
}

export function markDisconnectedByParticipation(participationId: string): Promise<RealtimeConnection> {
  return prisma.realtimeConnection.update({
    where: { participationId },
    data: { state: "disconnected", disconnectedAt: new Date() },
  });
}

export function deleteConnection(id: string): Promise<RealtimeConnection> {
  return prisma.realtimeConnection.delete({ where: { id } });
}

export function deleteByParticipation(participationId: string): Promise<RealtimeConnection> {
  return prisma.realtimeConnection.delete({ where: { participationId } });
}
