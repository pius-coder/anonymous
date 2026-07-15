import { IdentityV1 } from "@session-jeu/contracts";
import { rpcCall, rpcClients, timestampToIso } from "@/lib/rpc";
import type { AuthUser } from "./types";

export type AuthResponse = {
  user: AuthUser;
  session: {
    token: string;
    expiresAt: string;
  };
};

export const AuthService = {
  async register(email: string, password: string, name?: string) {
    const result = await rpcCall(() => rpcClients.identity.register({ email, password, name }));
    return mapAuthResult(result);
  },

  async login(email: string, password: string) {
    const result = await rpcCall(() => rpcClients.identity.login({ email, password }));
    return mapAuthResult(result);
  },

  logout() {
    return rpcCall(() => rpcClients.identity.logout({}));
  },

  async getMe() {
    const result = await rpcCall(() => rpcClients.identity.getCurrentUser({}));
    if (!result.success) return result;
    return { success: true as const, data: { user: mapUser(result.data.user) } };
  },

  requestPasswordReset(email: string) {
    return rpcCall(() => rpcClients.identity.requestPasswordReset({ email }));
  },

  resetPassword(token: string, newPassword: string) {
    return rpcCall(() => rpcClients.identity.resetPassword({ token, newPassword }));
  },
};

function mapAuthResult<T extends { user?: IdentityV1.User; sessionToken: string; expiresAt?: { seconds: bigint; nanos: number } }>(
  result: Awaited<ReturnType<typeof rpcCall<T>>>,
) {
  if (!result.success) return result;
  return {
    success: true as const,
    data: {
      user: mapUser(result.data.user),
      session: {
        token: result.data.sessionToken,
        expiresAt: timestampToIso(result.data.expiresAt),
      },
    } satisfies AuthResponse,
  };
}

function mapUser(user: IdentityV1.User | undefined): AuthUser {
  if (!user) throw new Error("USER_MISSING");
  return {
    id: user.id,
    email: user.email,
    name: user.name || null,
    avatarUrl: user.avatarUrl || null,
    roles: user.roles.map((role) => IdentityV1.UserRole[role]),
    sessionVersion: user.sessionVersion,
    createdAt: timestampToIso(user.createdAt),
  };
}
