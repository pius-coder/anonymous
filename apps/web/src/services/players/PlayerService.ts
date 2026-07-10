import { BaseApiService } from "../api/BaseApiService";

type ProfileResponse = {
  id: string;
  email: string;
  name: string | null;
  username: string;
  phone: string | null;
  role: string;
};

type HistoryEntry = {
  id: string;
  sessionName: string;
  sessionCode: string;
  status: string;
  createdAt: string;
};

export class PlayerService extends BaseApiService {
  async getProfile(): Promise<ProfileResponse> {
    const { response } = await this.request<ProfileResponse>("/v1/players/me", {
      authenticated: true,
    });
    return response;
  }

  async updateProfile(data: Record<string, unknown>): Promise<ProfileResponse> {
    const { response } = await this.request<ProfileResponse>("/v1/players/me", {
      method: "PATCH",
      body: data,
      authenticated: true,
    });
    return response;
  }

  async getHistory(params?: Record<string, string | undefined>): Promise<HistoryEntry[]> {
    const { response } = await this.request<HistoryEntry[]>("/v1/players/me/history", {
      query: params,
      authenticated: true,
    });
    return response;
  }

  async getStats(): Promise<Record<string, unknown>> {
    const { response } = await this.request<Record<string, unknown>>("/v1/players/me/stats", {
      authenticated: true,
    });
    return response;
  }
}
