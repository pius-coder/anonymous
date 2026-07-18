/**
 * Preparation domain client for lobby / admin UI.
 *
 * Uses the existing Hono REST surface under /v1 (already mounted).
 * Does NOT modify apps/web/src/services/rpcServices.ts (ownership SEQ-03 / forbidden).
 * ConnectRPC PreparationService transport exists on API but is mounted by SEQ-03.
 */
import { api, type ApiResponse } from "@/lib/api";

export type PreparationParticipant = {
  id: string;
  userId: string;
  role: string;
  status: string;
  readinessState: string;
  userName: string | null;
};

export type PreparationAnnouncement = {
  id: string;
  title: string;
  body: string;
  createdBy: string;
  createdAt: string;
};

export type PreparationSelfState = {
  id: string;
  status: string;
  readinessState: string;
  paymentState: string;
  admissionState: string;
  connectionState: string;
};

export type PreparationState = {
  partyId: string;
  status: string;
  selfUserId?: string;
  self?: PreparationSelfState;
  participants: PreparationParticipant[];
  announcements: PreparationAnnouncement[];
  stats: {
    total: number;
    present: number;
    ready: number;
    noResponse: number;
    absent: number;
  };
};

export type MarkStatusResult = {
  id: string;
  status: string;
  readinessState: string;
};

export type SendAnnouncementResult = {
  id: string;
  notificationJobId?: string | null;
  notificationJobIds?: string[];
};

export type ConfirmStartResult = {
  status: string;
  overriddenAbsents: number;
};

export function getPlayerPreparation(partyCode: string): Promise<ApiResponse<PreparationState>> {
  return api<PreparationState>(`/v1/parties/${encodeURIComponent(partyCode)}/preparation`);
}

export function markPresent(partyCode: string): Promise<ApiResponse<MarkStatusResult>> {
  return api<MarkStatusResult>(
    `/v1/parties/${encodeURIComponent(partyCode)}/preparation/mark-present`,
    {
      method: "POST",
    },
  );
}

export function markReady(partyCode: string): Promise<ApiResponse<MarkStatusResult>> {
  return api<MarkStatusResult>(
    `/v1/parties/${encodeURIComponent(partyCode)}/preparation/mark-ready`,
    {
      method: "POST",
    },
  );
}

export function leavePreparation(partyCode: string): Promise<ApiResponse<{ status: string }>> {
  return api<{ status: string }>(`/v1/parties/${encodeURIComponent(partyCode)}/preparation/leave`, {
    method: "POST",
  });
}

export function getAdminPreparationState(partyId: string): Promise<ApiResponse<PreparationState>> {
  return api<PreparationState>(
    `/v1/admin/parties/${encodeURIComponent(partyId)}/preparation/state`,
  );
}

export function openPreparation(partyId: string): Promise<ApiResponse<{ status: string }>> {
  return api<{ status: string }>(
    `/v1/admin/parties/${encodeURIComponent(partyId)}/preparation/open`,
    {
      method: "POST",
    },
  );
}

export function sendAnnouncement(
  partyId: string,
  title: string,
  body: string,
): Promise<ApiResponse<SendAnnouncementResult>> {
  return api<SendAnnouncementResult>(
    `/v1/admin/parties/${encodeURIComponent(partyId)}/preparation/announcement`,
    {
      method: "POST",
      body: JSON.stringify({ title, body }),
    },
  );
}

export function confirmStart(
  partyId: string,
  options: { forceWithAbsents?: boolean; overrideReason?: string } = {},
): Promise<ApiResponse<ConfirmStartResult>> {
  return api<ConfirmStartResult>(
    `/v1/admin/parties/${encodeURIComponent(partyId)}/preparation/confirm-start`,
    {
      method: "POST",
      body: JSON.stringify({
        forceWithAbsents: options.forceWithAbsents ?? false,
        overrideReason: options.overrideReason,
      }),
    },
  );
}
