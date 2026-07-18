/**
 * Domain adapter for Participation (register / cancel / my status).
 * Uses REST use-case surface; cancel has no RPC in frozen contracts yet.
 * Does not touch `rpcServices.ts`. Client never decides payment/readiness/live admission.
 */
import { api } from "@/lib/api";
import { sessionQueryKeys } from "@/services/session/sessionAdapter";

export type ParticipationStatusView = {
  id: string;
  partyId: string;
  userId: string;
  role: string;
  status: string;
  paymentState: string;
  admissionState: string;
  readinessState: string;
  connectionState: string;
  createdAt: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
};

export type ParticipationAdapterError = {
  code: string;
  message: string;
};

export type ParticipationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ParticipationAdapterError };

function idempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function getMyParticipation(
  partyCode: string,
): Promise<ParticipationResult<ParticipationStatusView | null>> {
  const code = encodeURIComponent(partyCode.trim().toUpperCase());
  const result = await api<ParticipationStatusView>(`/v1/parties/${code}/my-participation`);
  if (!result.success) {
    if (result.error.code === "PARTICIPATION_NOT_FOUND") {
      return { success: true, data: null };
    }
    if (result.error.code === "UNAUTHORIZED" || result.error.code === "Unauthenticated") {
      return {
        success: false,
        error: { code: "UNAUTHENTICATED", message: "Connexion requise pour voir votre inscription." },
      };
    }
    return {
      success: false,
      error: {
        code: result.error.code,
        message: result.error.message || "Impossible de charger l'inscription.",
      },
    };
  }
  return { success: true, data: result.data };
}

export async function registerForParty(
  partyCode: string,
  options?: { idempotencyKey?: string },
): Promise<ParticipationResult<ParticipationStatusView>> {
  const code = encodeURIComponent(partyCode.trim().toUpperCase());
  const result = await api<ParticipationStatusView>(`/v1/parties/${code}/register`, {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: options?.idempotencyKey ?? idempotencyKey("register"),
    }),
  });
  if (!result.success) {
    return {
      success: false,
      error: {
        code: result.error.code,
        message: result.error.message || "Inscription impossible.",
      },
    };
  }
  return { success: true, data: result.data };
}

export async function cancelMyParticipation(
  partyCode: string,
): Promise<ParticipationResult<ParticipationStatusView>> {
  const code = encodeURIComponent(partyCode.trim().toUpperCase());
  const result = await api<ParticipationStatusView>(`/v1/parties/${code}/cancel`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!result.success) {
    return {
      success: false,
      error: {
        code: result.error.code,
        message: result.error.message || "Annulation impossible.",
      },
    };
  }
  return { success: true, data: result.data };
}

export const participationQueryKeys = {
  all: ["participation"] as const,
  mine: (code: string) => ["participation", "mine", code.toUpperCase()] as const,
};

/** Query keys to invalidate after register/cancel (participation + party capacity). */
export function participationMutationInvalidateKeys(partyCode: string) {
  return [
    participationQueryKeys.mine(partyCode),
    sessionQueryKeys.all,
    sessionQueryKeys.detail(partyCode),
  ] as const;
}

export function isRegisteredStatus(status: string | undefined): boolean {
  if (!status) return false;
  return status !== "ABANDONED" && status !== "INVITED";
}

export function isCancelledParticipation(participation: ParticipationStatusView | null | undefined): boolean {
  return Boolean(participation?.cancelledAt || participation?.status === "ABANDONED");
}

export function isPaymentSettled(participation: ParticipationStatusView | null | undefined): boolean {
  return participation?.paymentState === "PAID";
}
