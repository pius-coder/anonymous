"use server";

import { NotificationService } from "@/services/notifications/NotificationService";
import type { NotificationEntry } from "@/services/notifications/types";

export async function getNotifications(): Promise<{ entries: NotificationEntry[]; authenticated: boolean }> {
  try {
    const service = new NotificationService();
    const entries = await service.getNotifications();
    return { entries, authenticated: true };
  } catch (e: unknown) {
    const err = e as { status?: number };
    if (err.status === 401) {
      return { entries: [], authenticated: false };
    }
    return { entries: [], authenticated: true };
  }
}
