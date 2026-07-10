import { BaseApiService } from "../api/BaseApiService";

type LiveStateResponse = {
  id: string;
  sessionId: string;
  phase: string;
  currentRoundId: string | null;
  pausedAt: string | null;
};
type ReservationResponse = { reservationToken: string };

export class LiveService extends BaseApiService {
  async getLiveState(sessionId: string): Promise<LiveStateResponse> {
    const { response } = await this.request<LiveStateResponse>(`/v1/live/${sessionId}/state`, {
      authenticated: true,
    });
    return response;
  }

  async createReservation(sessionId: string, joinToken: string): Promise<string> {
    const { response } = await this.request<ReservationResponse>(`/v1/live/sessions/${sessionId}/reservation`, {
      method: "POST",
      body: { joinToken },
      authenticated: true,
    });
    return response.reservationToken;
  }
}
