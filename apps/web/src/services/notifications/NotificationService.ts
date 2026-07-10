import { BaseApiService } from "../api/BaseApiService";
import type { NotificationEntry, NotificationPreferences } from "./types";

type NotificationsResponse = {
  entries: NotificationEntry[];
};

export class NotificationService extends BaseApiService {
  async getNotifications(): Promise<NotificationEntry[]> {
    const { response } = await this.request<NotificationsResponse>("/v1/me/notifications", {
      authenticated: true,
    });
    return response.entries;
  }

  async getPreferences(): Promise<NotificationPreferences> {
    const { response } = await this.request<NotificationPreferences>("/v1/me/notification-preferences", {
      authenticated: true,
    });
    return response;
  }

  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const { response } = await this.request<NotificationPreferences>("/v1/me/notification-preferences", {
      method: "PATCH",
      body: prefs,
      authenticated: true,
    });
    return response;
  }
}
