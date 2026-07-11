import { BaseApiService } from "../api/BaseApiService";
import type { CatalogueSession, SessionDetail } from "./types";

type CatalogueResponse = {
  sessions: CatalogueSession[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type RegistrationResponse = { id: string; status: string };
type JoinTokenResponse = { joinToken: string };
type LobbyResponse = { lobby: unknown };

export class SessionService extends BaseApiService {
  async getCatalogue(params?: Record<string, string | undefined>): Promise<CatalogueResponse> {
    const { response } = await this.request<CatalogueResponse>("/v1/public/sessions", {
      query: params,
      authenticated: false,
    });
    return response;
  }

  async getDetail(code: string): Promise<SessionDetail> {
    const { response } = await this.request<SessionDetail>(`/v1/public/sessions/${code}`, {
      authenticated: false,
    });
    return response;
  }

  async register(sessionId: string): Promise<RegistrationResponse> {
    const { response } = await this.request<RegistrationResponse>(
      `/v1/sessions/${sessionId}/register`,
      {
        method: "POST",
        authenticated: true,
      },
    );
    return response;
  }

  async getRegistration(sessionId: string): Promise<RegistrationResponse | null> {
    try {
      const { response } = await this.request<RegistrationResponse>(
        `/v1/sessions/${sessionId}/registration`,
        {
          authenticated: true,
        },
      );
      return response;
    } catch {
      return null;
    }
  }

  async cancelRegistration(id: string): Promise<void> {
    await this.request(`/v1/registrations/${id}/cancel`, {
      method: "POST",
      authenticated: true,
    });
  }

  async getLobby(sessionId: string): Promise<LobbyResponse> {
    const { response } = await this.request<LobbyResponse>(`/v1/sessions/${sessionId}/lobby`, {
      authenticated: true,
    });
    return response;
  }

  async getJoinToken(sessionId: string): Promise<string> {
    const { response } = await this.request<JoinTokenResponse>(
      `/v1/sessions/${sessionId}/join-token`,
      {
        authenticated: true,
      },
    );
    return response.joinToken;
  }

  async checkIn(sessionId: string): Promise<void> {
    await this.request(`/v1/sessions/${sessionId}/check-in`, {
      method: "POST",
      authenticated: true,
    });
  }
}
