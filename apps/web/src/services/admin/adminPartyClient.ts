import { api, type ApiResponse } from "@/lib/api";

export type AdminPartyDetail = {
  id: string;
  code: string;
  name: string;
  status: string;
  visibility: string;
  scheduledAt: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  roundProgram: unknown;
  createdAt: string;
  updatedAt: string;
  participantCount: number;
  description: string | null;
  entryFeeAmount: number | null;
  entryFeeCurrency: string;
  configVersion: number;
  feeVersion: number;
};

export type AdminPartyListResult = {
  parties: AdminPartyDetail[];
  total: number;
};

export type ControlLeaseStatus = {
  partyId: string;
  holderUserId: string | null;
  expiresAt: string | null;
  heldByCaller: boolean;
};

export type AuditEvent = {
  id: string;
  action: string;
  actorUserId: string | null;
  entity: string;
  entityId: string | null;
  result: string | null;
  reason: string | null;
  createdAt: string;
};

export type CreatePartyInput = {
  code: string;
  name: string;
  visibility?: "public" | "private";
  minPlayers?: number;
  maxPlayers?: number;
  roundProgram?: unknown;
  description?: string;
  entryFeeAmount?: number | null;
  entryFeeCurrency?: string;
  scheduledAt?: string;
};

export type UpdatePartyInput = {
  name?: string;
  visibility?: "public" | "private";
  minPlayers?: number;
  maxPlayers?: number;
  roundProgram?: unknown;
  description?: string | null;
  entryFeeAmount?: number | null;
  entryFeeCurrency?: string;
  expectedUpdatedAt?: string;
  expectedConfigVersion?: number;
};

export function listAdminParties(input?: {
  status?: string;
  skip?: number;
  take?: number;
}): Promise<ApiResponse<AdminPartyListResult>> {
  const params = new URLSearchParams();
  if (input?.status) params.set("status", input.status);
  if (input?.skip != null) params.set("skip", String(input.skip));
  if (input?.take != null) params.set("take", String(input.take));
  const q = params.toString();
  return api<AdminPartyListResult>(`/v1/admin/parties${q ? `?${q}` : ""}`);
}

export function getAdminParty(partyId: string): Promise<ApiResponse<AdminPartyDetail>> {
  return api<AdminPartyDetail>(`/v1/admin/parties/${encodeURIComponent(partyId)}`);
}

export function createAdminParty(input: CreatePartyInput): Promise<ApiResponse<AdminPartyDetail>> {
  return api<AdminPartyDetail>("/v1/admin/parties", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminPartyConfig(
  partyId: string,
  input: UpdatePartyInput,
): Promise<ApiResponse<AdminPartyDetail>> {
  return api<AdminPartyDetail>(`/v1/admin/parties/${encodeURIComponent(partyId)}/config`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function validateAdminParty(partyId: string): Promise<ApiResponse<{ valid: boolean; issues: unknown[] }>> {
  return api(`/v1/admin/parties/${encodeURIComponent(partyId)}/validate`, { method: "POST" });
}

export function publishAdminParty(
  partyId: string,
  input: { reason?: string; expectedUpdatedAt?: string; expectedConfigVersion?: number } = {},
): Promise<ApiResponse<AdminPartyDetail>> {
  return api<AdminPartyDetail>(`/v1/admin/parties/${encodeURIComponent(partyId)}/publish`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function scheduleAdminParty(
  partyId: string,
  input: { scheduledAt: string; expectedUpdatedAt?: string; expectedConfigVersion?: number },
): Promise<ApiResponse<AdminPartyDetail>> {
  return api<AdminPartyDetail>(`/v1/admin/parties/${encodeURIComponent(partyId)}/schedule`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function cancelAdminParty(
  partyId: string,
  input: { reason: string; expectedUpdatedAt?: string; expectedConfigVersion?: number },
): Promise<ApiResponse<AdminPartyDetail>> {
  return api<AdminPartyDetail>(`/v1/admin/parties/${encodeURIComponent(partyId)}/cancel`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function completeAdminParty(
  partyId: string,
  input: { reason: string; expectedUpdatedAt?: string; expectedConfigVersion?: number },
): Promise<ApiResponse<AdminPartyDetail>> {
  return api<AdminPartyDetail>(`/v1/admin/parties/${encodeURIComponent(partyId)}/complete`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getControlLease(partyId: string): Promise<ApiResponse<ControlLeaseStatus>> {
  return api<ControlLeaseStatus>(`/v1/admin/parties/${encodeURIComponent(partyId)}/control-lease`);
}

export function acquireControlLease(
  partyId: string,
  ttlSeconds = 120,
): Promise<ApiResponse<ControlLeaseStatus>> {
  return api<ControlLeaseStatus>(`/v1/admin/parties/${encodeURIComponent(partyId)}/control-lease`, {
    method: "POST",
    body: JSON.stringify({ ttlSeconds }),
  });
}

export function releaseControlLease(partyId: string): Promise<ApiResponse<ControlLeaseStatus>> {
  return api<ControlLeaseStatus>(`/v1/admin/parties/${encodeURIComponent(partyId)}/control-lease`, {
    method: "DELETE",
  });
}

export function listPartyAudit(partyId: string): Promise<ApiResponse<{ events: AuditEvent[] }>> {
  return api<{ events: AuditEvent[] }>(`/v1/admin/parties/${encodeURIComponent(partyId)}/audit`);
}
