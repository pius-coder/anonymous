"use server";

import { AdminService } from "@/services/admin/AdminService";
import type { AdminUser, AdminDashboard, Paginated, AdminSession, AdminSessionDetail, PaymentTransaction, AuditEntry, SupportUserSummary, SupportUser } from "@/services/admin/types";

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const admin = new AdminService();
  return admin.getCurrentAdmin();
}

export async function getAdminDashboard(): Promise<AdminDashboard | null> {
  try {
    const admin = new AdminService();
    return await admin.getDashboard();
  } catch {
    return null;
  }
}

export async function getAdminSessions(params?: Record<string, string | undefined>): Promise<Paginated<AdminSession> | null> {
  try {
    const admin = new AdminService();
    return await admin.getSessions(params);
  } catch {
    return null;
  }
}

export async function getAdminSession(id: string): Promise<AdminSessionDetail | null> {
  try {
    const admin = new AdminService();
    return await admin.getSession(id);
  } catch {
    return null;
  }
}

export async function getAdminPayments(params?: Record<string, string | undefined>): Promise<Paginated<PaymentTransaction> | null> {
  try {
    const admin = new AdminService();
    return await admin.getPayments(params);
  } catch {
    return null;
  }
}

export async function getAdminAuditLogs(params?: Record<string, string | undefined>): Promise<Paginated<AuditEntry> | null> {
  try {
    const admin = new AdminService();
    return await admin.getAuditLogs(params);
  } catch {
    return null;
  }
}

export async function getAdminUsers(params?: Record<string, string | undefined>): Promise<Paginated<SupportUserSummary> | null> {
  try {
    const admin = new AdminService();
    return await admin.getUsers(params);
  } catch {
    return null;
  }
}

export async function getAdminUser(id: string): Promise<SupportUser | null> {
  try {
    const admin = new AdminService();
    return await admin.getUser(id);
  } catch {
    return null;
  }
}
