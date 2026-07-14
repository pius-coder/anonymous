import { api } from "../../lib/api.js";
import type { AuthUser } from "./types.js";

export type AuthResponse = {
  user: AuthUser;
  session: {
    token: string;
    expiresAt: string;
  };
};

export const AuthService = {
  register(email: string, password: string, name?: string) {
    return api<AuthResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
  },

  login(email: string, password: string) {
    return api<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  logout() {
    return api("/api/v1/auth/logout", { method: "POST" });
  },

  getMe() {
    return api<{ user: AuthUser }>("/api/v1/me");
  },
};
