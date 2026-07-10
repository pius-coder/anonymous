import { BaseApiService } from "../api/BaseApiService";

type InitiatePaymentResponse = { paymentId: string; redirectUrl: string };
type PaymentStatusResponse = { id: string; status: string; amountXaf: number };

export class PaymentService extends BaseApiService {
  async initiateFapshiPayment(registrationId: string, redirectUrl: string): Promise<InitiatePaymentResponse> {
    const { response } = await this.request<InitiatePaymentResponse>("/v1/payments/fapshi/initiate", {
      method: "POST",
      body: { registrationId, redirectUrl },
      authenticated: true,
    });
    return response;
  }

  async getPaymentStatus(id: string): Promise<PaymentStatusResponse> {
    const { response } = await this.request<PaymentStatusResponse>(`/v1/payments/${id}/status`, {
      authenticated: true,
    });
    return response;
  }

  async payWithWallet(registrationId: string, idempotencyKey: string): Promise<void> {
    await this.request(`/v1/registrations/${registrationId}/pay-with-wallet`, {
      method: "POST",
      body: { idempotencyKey },
      authenticated: true,
    });
  }
}
