import { BaseApiService } from "../api/BaseApiService";

type WalletResponse = { id: string; balanceXaf: number; currency: string; isFrozen: boolean };
type LedgerEntry = { id: string; amountXaf: number; balanceAfterXaf: number; direction: string; type: string; createdAt: string };

export class WalletService extends BaseApiService {
  async getWallet(): Promise<WalletResponse> {
    const { response } = await this.request<WalletResponse>("/v1/wallet/me", {
      authenticated: true,
    });
    return response;
  }

  async getLedger(params?: Record<string, string | undefined>): Promise<LedgerEntry[]> {
    const { response } = await this.request<LedgerEntry[]>("/v1/wallet/me/ledger", {
      query: params,
      authenticated: true,
    });
    return response;
  }

  async requestWithdrawal(data: Record<string, unknown>): Promise<void> {
    await this.request("/v1/wallet/me/withdraw", {
      method: "POST",
      body: data,
      authenticated: true,
    });
  }
}
