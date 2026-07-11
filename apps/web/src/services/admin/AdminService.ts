import { BaseApiService } from "../api/BaseApiService";
import type {
  AdminUser,
  AdminDashboard,
  AdminSession,
  AdminSessionDetail,
  Paginated,
  PaymentTransaction,
  MiniGameDefinition,
  AuditEntry,
  SupportUser,
  SupportUserSummary,
  ComplianceGate,
} from "./types";

export class AdminService extends BaseApiService {
  async getCurrentAdmin(): Promise<AdminUser | null> {
    try {
      const { response } = await this.request<{ user: AdminUser }>("/v1/me", {
        authenticated: true,
      });
      return response.user;
    } catch {
      return null;
    }
  }

  async getDashboard(): Promise<AdminDashboard> {
    const { response } = await this.request<{ dashboard: AdminDashboard }>("/v1/admin/dashboard", {
      authenticated: true,
    });
    return response.dashboard;
  }

  async getSessions(params?: Record<string, string | undefined>): Promise<Paginated<AdminSession>> {
    const { response } = await this.request<Paginated<AdminSession>>("/v1/admin/sessions", {
      query: params,
      authenticated: true,
    });
    return response;
  }

  async getSession(id: string): Promise<AdminSessionDetail> {
    const { response } = await this.request<{ session: AdminSessionDetail }>(
      `/v1/admin/sessions/${id}`,
      {
        authenticated: true,
      },
    );
    return response.session;
  }

  async createSession(data: Record<string, unknown>): Promise<AdminSession> {
    const { response } = await this.request<{ session: AdminSession }>("/v1/admin/sessions", {
      method: "POST",
      body: data,
      authenticated: true,
    });
    return response.session;
  }

  async updateSession(id: string, data: Record<string, unknown>): Promise<AdminSession> {
    const { response } = await this.request<{ session: AdminSession }>(`/v1/admin/sessions/${id}`, {
      method: "PATCH",
      body: data,
      authenticated: true,
    });
    return response.session;
  }

  async publishSession(
    id: string,
    data: { expectedConfigVersion: number; reason: string },
  ): Promise<void> {
    await this.request(`/v1/admin/sessions/${id}/publish`, {
      method: "POST",
      body: data,
      authenticated: true,
    });
  }

  async openRegistration(
    id: string,
    data: { expectedConfigVersion: number; reason: string },
  ): Promise<void> {
    await this.request(`/v1/admin/sessions/${id}/open-registration`, {
      method: "POST",
      body: data,
      authenticated: true,
    });
  }

  async cancelSession(
    id: string,
    data: { expectedConfigVersion: number; reason: string },
  ): Promise<void> {
    await this.request(`/v1/admin/sessions/${id}/cancel`, {
      method: "POST",
      body: data,
      authenticated: true,
    });
  }

  async getPayments(
    params?: Record<string, string | undefined>,
  ): Promise<Paginated<PaymentTransaction>> {
    const { response } = await this.request<Paginated<PaymentTransaction>>("/v1/admin/payments", {
      query: params,
      authenticated: true,
    });
    return response;
  }

  async reconcilePayment(id: string, reason: string): Promise<void> {
    await this.request(`/v1/admin/payments/${id}/reconcile`, {
      method: "POST",
      body: { reason },
      authenticated: true,
    });
  }

  async adjustWallet(userId: string, data: Record<string, unknown>): Promise<void> {
    await this.request(`/v1/admin/wallets/${userId}/adjust`, {
      method: "POST",
      body: data,
      authenticated: true,
    });
  }

  async getMinigames(): Promise<MiniGameDefinition[]> {
    const { response } = await this.request<{ definitions: MiniGameDefinition[] }>(
      "/v1/admin/minigames",
      {
        authenticated: true,
      },
    );
    return response.definitions;
  }

  async toggleMinigame(id: string, enabled: boolean): Promise<void> {
    await this.request(`/v1/admin/minigames/${id}/enable`, {
      method: "POST",
      body: { enabled },
      authenticated: true,
    });
  }

  async getComplianceGates(): Promise<ComplianceGate[]> {
    const { response } = await this.request<{ gates: ComplianceGate[] }>(
      "/v1/admin/compliance/gates",
      {
        authenticated: true,
      },
    );
    return response.gates;
  }

  async updateComplianceGate(id: string, data: Record<string, unknown>): Promise<void> {
    await this.request(`/v1/admin/compliance/gates/${id}`, {
      method: "PATCH",
      body: data,
      authenticated: true,
    });
  }

  async getAuditLogs(params?: Record<string, string | undefined>): Promise<Paginated<AuditEntry>> {
    const { response } = await this.request<Paginated<AuditEntry>>("/v1/admin/audit-logs", {
      query: params,
      authenticated: true,
    });
    return response;
  }

  async getUsers(
    params?: Record<string, string | undefined>,
  ): Promise<Paginated<SupportUserSummary>> {
    const { response } = await this.request<Paginated<SupportUserSummary>>(
      "/v1/admin/support/users",
      {
        query: params,
        authenticated: true,
      },
    );
    return response;
  }

  async getUser(id: string): Promise<SupportUser> {
    const { response } = await this.request<{ user: SupportUser }>(
      `/v1/admin/support/users/${id}`,
      {
        authenticated: true,
      },
    );
    return response.user;
  }

  async getResults(sessionId: string): Promise<unknown> {
    const { response } = await this.request<unknown>(`/v1/admin/sessions/${sessionId}/results`, {
      authenticated: true,
    });
    return response;
  }

  async finalizeSession(sessionId: string, data: Record<string, unknown>): Promise<void> {
    await this.request(`/v1/admin/sessions/${sessionId}/finalize`, {
      method: "POST",
      body: data,
      authenticated: true,
    });
  }

  async startLiveRound(sessionId: string, data: Record<string, unknown>): Promise<void> {
    await this.request(`/v1/admin/live/${sessionId}/rounds/start`, {
      method: "POST",
      body: data,
      authenticated: true,
    });
  }

  async pauseLive(sessionId: string, reason?: string): Promise<void> {
    await this.request(`/v1/admin/live/${sessionId}/pause`, {
      method: "POST",
      body: reason ? { reason } : undefined,
      authenticated: true,
    });
  }

  async resumeLive(sessionId: string): Promise<void> {
    await this.request(`/v1/admin/live/${sessionId}/resume`, {
      method: "POST",
      authenticated: true,
    });
  }

  async shareSessionNotification(sessionId: string): Promise<void> {
    await this.request(`/v1/admin/notifications/session/${sessionId}/share`, {
      method: "POST",
      authenticated: true,
    });
  }
}
