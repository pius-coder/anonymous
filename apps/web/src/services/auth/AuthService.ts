import { BaseApiService } from "../api/BaseApiService";
import type { SessionUser } from "./types";

export type AuthInput = { email: string; password: string };
export type RegisterInput = { email: string; password: string; username: string; name?: string; phone?: string };

type MeResponse = { user: SessionUser };
type LogoutResponse = { loggedOut: boolean };

export class AuthService extends BaseApiService {
  async register(input: RegisterInput): Promise<SessionUser> {
    const { response } = await this.request<MeResponse>("/v1/auth/register", {
      method: "POST",
      body: input,
    });
    return response.user;
  }

  async login(input: AuthInput): Promise<SessionUser> {
    const { response } = await this.request<MeResponse>("/v1/auth/login", {
      method: "POST",
      body: input,
    });
    return response.user;
  }

  async logout(): Promise<void> {
    await this.request<LogoutResponse>("/v1/auth/logout", {
      method: "POST",
      authenticated: true,
    });
  }

  async getMe(): Promise<SessionUser | null> {
    try {
      const { response } = await this.request<MeResponse>("/v1/me", {
        authenticated: true,
      });
      return response.user;
    } catch {
      return null;
    }
  }
}
