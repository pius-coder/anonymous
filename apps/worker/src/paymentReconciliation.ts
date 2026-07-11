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

function hasVerifiedFapshiSuccessAmount(input: {
  status: FapshiProviderStatus;
  expectedAmountXaf: number;
  providerAmountXaf: unknown;
}) {
  if (input.status !== "SUCCESSFUL") return true;
  const providerAmountXaf = input.providerAmountXaf;

  return (
    Number.isSafeInteger(input.expectedAmountXaf) &&
    input.expectedAmountXaf > 0 &&
    typeof providerAmountXaf === "number" &&
    Number.isSafeInteger(providerAmountXaf) &&
    providerAmountXaf > 0 &&
    providerAmountXaf === input.expectedAmountXaf
  );
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

  if (
    !hasVerifiedFapshiSuccessAmount({
      status: provider.status,
      expectedAmountXaf: payment.amountXaf,
      providerAmountXaf: provider.amount,
    })
  ) {
    await prisma.auditLog.create({
      data: {
        userId: payment.userId,
        action: "payment.reconciliation-amount-verification-failed",
        entity: "PaymentTransaction",
        entityId: payment.id,
        newData: {
          expectedAmountXaf: payment.amountXaf,
          providerAmountXaf: provider.amount ?? null,
          providerStatus: provider.status,
        },
      },
    });
    return { reconciled: false, reason: "amount-verification-failed" };
  }

  const paymentUpdate = await prisma.paymentTransaction.updateMany({
    where: { id: payment.id, status: PaymentStatus.PENDING },
    data: {
      status: nextStatus,
      providerStatus: provider.status,
      metadata: provider as Prisma.InputJsonValue,
      webhookReceivedAt: provider.status === "SUCCESSFUL" ? now : payment.webhookReceivedAt,
    },
  });

  if (paymentUpdate.count !== 1) {
    return { reconciled: false, reason: "payment-status-changed" };
  }

  let registrationPaid = false;
  if (
    provider.status === "SUCCESSFUL" &&
    payment.registration?.status === SessionRegistrationStatus.PAYMENT_PENDING
  ) {
    const registrationUpdate = await prisma.sessionRegistration.updateMany({
      where: {
        id: payment.registration.id,
        status: SessionRegistrationStatus.PAYMENT_PENDING,
      },
      data: {
        status: SessionRegistrationStatus.PAID,
        paidAt: now,
      },
    });
    registrationPaid = registrationUpdate.count === 1;
  }

  await prisma.auditLog.create({
    data: {
      userId: payment.userId,
      action: "payment.reconciled",
      entity: "PaymentTransaction",
      entityId: payment.id,
      newData: {
        status: nextStatus,
        providerStatus: provider.status,
        registrationPaid,
      },
    },
  });

  return { reconciled: true, paymentId: payment.id, status: nextStatus, registrationPaid };
}
