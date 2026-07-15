import { createClient, ConnectError } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import {
  AdminV1,
  IdentityV1,
  MiniGameV1,
  NotificationV1,
  ParticipationV1,
  PaymentV1,
  PreparationV1,
  RealtimeV1,
  RoundV1,
  ScoringV1,
  SessionV1,
} from "@session-jeu/contracts";
import { publicEnv } from "./env";

export type RpcSuccess<T> = { success: true; data: T };
export type RpcFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};
export type RpcResult<T> = RpcSuccess<T> | RpcFailure;

const baseUrl = publicEnv.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "");

const transport = createConnectTransport({
  baseUrl,
  useBinaryFormat: true,
  defaultTimeoutMs: 15_000,
  fetch(input, init) {
    return globalThis.fetch(input, { ...init, credentials: "include" });
  },
});

export const rpcClients = {
  identity: createClient(IdentityV1.IdentityService, transport),
  sessions: createClient(SessionV1.SessionService, transport),
  participations: createClient(ParticipationV1.ParticipationService, transport),
  preparation: createClient(PreparationV1.PreparationService, transport),
  payments: createClient(PaymentV1.PaymentService, transport),
  realtime: createClient(RealtimeV1.RealtimeAccessService, transport),
  rounds: createClient(RoundV1.RoundService, transport),
  minigames: createClient(MiniGameV1.MiniGameService, transport),
  scoring: createClient(ScoringV1.ScoringService, transport),
  admin: createClient(AdminV1.AdminService, transport),
  notifications: createClient(NotificationV1.NotificationService, transport),
};

export async function rpcCall<T>(call: () => Promise<T>): Promise<RpcResult<T>> {
  try {
    return { success: true, data: await call() };
  } catch (error) {
    const connectError = ConnectError.from(error);
    return {
      success: false,
      error: {
        code: connectError.code.toString(),
        message: connectError.rawMessage || "Le service est momentanement indisponible.",
        details: connectError.details,
      },
    };
  }
}

export function correlationId(prefix = "web") {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { value: `${prefix}-${id}` };
}

export function timestampToIso(
  value: { seconds: bigint; nanos: number } | undefined,
): string {
  if (!value) return new Date(0).toISOString();
  return new Date(Number(value.seconds) * 1_000 + value.nanos / 1_000_000).toISOString();
}

export function dateToTimestamp(value: Date | string) {
  const milliseconds = new Date(value).getTime();
  return {
    seconds: BigInt(Math.floor(milliseconds / 1_000)),
    nanos: (milliseconds % 1_000) * 1_000_000,
  };
}
