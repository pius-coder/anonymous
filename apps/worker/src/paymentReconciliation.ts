import { Prisma, prisma, PaymentStatus, SessionRegistrationStatus } from "@session-jeu/db";

type FapshiProviderStatus = "CREATED" | "PENDING" | "SUCCESSFUL" | "FAILED" | "EXPIRED";

type FapshiStatusResponse = {
  transId: string;
  status: FapshiProviderStatus;
  amount?: number;
  externalId?: string;
  [key: string]: unknown;
};

export type PaymentReconciliationJobData = {
  paymentId?: string;
};

class FapshiProviderError extends Error {}

function getFapshiBaseUrl() {
  if (process.env.FAPSHI_BASE_URL) return process.env.FAPSHI_BASE_URL;
  return process.env.FAPSHI_ENV === "live"
    ? "https://live.fapshi.com"
    : "https://sandbox.fapshi.com";
}

function getFapshiCredentials() {
  const apiuser = process.env.FAPSHI_API_USER;
  const apikey = process.env.FAPSHI_API_KEY;
  if (!apiuser || !apikey) {
    throw new FapshiProviderError("Fapshi credentials are not configured");
  }
  return { apiuser, apikey };
}

function mapFapshiStatus(status: FapshiProviderStatus) {
  if (status === "SUCCESSFUL") return PaymentStatus.SUCCESSFUL;
  if (status === "FAILED") return PaymentStatus.FAILED;
  if (status === "EXPIRED") return PaymentStatus.EXPIRED;
  return PaymentStatus.PENDING;
}

async function getFapshiPaymentStatus(transId: string) {
  const { apiuser, apikey } = getFapshiCredentials();
  const res = await fetch(`${getFapshiBaseUrl()}/payment-status/${encodeURIComponent(transId)}`, {
    headers: { apiuser, apikey },
  });
  const body = (await res.json().catch(() => ({}))) as FapshiStatusResponse & { message?: string };
  if (!res.ok) {
    throw new FapshiProviderError(body.message ?? "Fapshi status request failed");
  }
  return body;
}

export async function processPaymentReconciliation(
  data: PaymentReconciliationJobData,
  now = new Date(),
) {
  if (!data.paymentId) {
    throw new Error("paymentId is required");
  }

  const payment = await prisma.paymentTransaction.findUnique({
    where: { id: data.paymentId },
    include: { registration: true },
  });

  if (!payment) return { reconciled: false, reason: "payment-not-found" };
  if (!payment.providerTransId) return { reconciled: false, reason: "missing-provider-trans-id" };
  if (payment.status !== PaymentStatus.PENDING) {
    return { reconciled: false, reason: "payment-terminal" };
  }

  const provider = await getFapshiPaymentStatus(payment.providerTransId);
  const nextStatus = mapFapshiStatus(provider.status);

  const updated = await prisma.paymentTransaction.update({
    where: { id: payment.id },
    data: {
      status: nextStatus,
      providerStatus: provider.status,
      metadata: provider as Prisma.InputJsonValue,
      webhookReceivedAt: provider.status === "SUCCESSFUL" ? now : payment.webhookReceivedAt,
    },
  });

  let registrationPaid = false;
  if (
    provider.status === "SUCCESSFUL" &&
    payment.registration?.status === SessionRegistrationStatus.PAYMENT_PENDING
  ) {
    await prisma.sessionRegistration.update({
      where: { id: payment.registration.id },
      data: {
        status: SessionRegistrationStatus.PAID,
        paidAt: now,
      },
    });
    registrationPaid = true;
  }

  await prisma.auditLog.create({
    data: {
      userId: payment.userId,
      action: "payment.reconciled",
      entity: "PaymentTransaction",
      entityId: payment.id,
      newData: {
        status: updated.status,
        providerStatus: provider.status,
        registrationPaid,
      },
    },
  });

  return { reconciled: true, paymentId: payment.id, status: updated.status, registrationPaid };
}
