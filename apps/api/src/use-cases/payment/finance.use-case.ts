/**
 * Finance-privileged commands: expire, compensation (maker-checker), payout, reports.
 * Collection credentials never used for payout. ADMIN is not authorized at the route layer.
 */
import { paymentRepository, auditRepository } from "@session-jeu/db";
import {
  PAYMENT_ERRORS,
  expireCollectionPayment,
  executePayout,
  getCollectionPaymentStatus,
  wireStatusToEnum,
  type FapshiWireStatusName,
} from "@session-jeu/shared";
import { isStrictDeployEnv, resolveAppEnv } from "@session-jeu/config";
import { PaymentUseCaseError, type PaymentDetail } from "./payment.use-case.js";

const PAYOUT_VELOCITY_WINDOW_MS = 60 * 60 * 1000;
const PAYOUT_VELOCITY_MAX = Number(process.env.FINANCE_PAYOUT_VELOCITY_MAX ?? 20);
const FRAUD_HOLD_USERS = new Set(
  (process.env.FINANCE_FRAUD_HOLD_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

type CompensationNotes = {
  kind: "COMPENSATION_REQUEST";
  decision: "PENDING" | "APPROVED_PAYOUT" | "APPROVED_MANUAL" | "REJECTED" | "OUT_OF_SCOPE";
  paymentId: string;
  amount: number;
  currency: string;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  beneficiaryPhone?: string;
  beneficiaryEmail?: string;
  beneficiaryVerified?: boolean;
  payoutTransactionId?: string;
  ledgerCompensationId?: string;
};

function parseNotes(raw: string | null | undefined): CompensationNotes | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CompensationNotes;
    if (parsed.kind !== "COMPENSATION_REQUEST") return null;
    return parsed;
  } catch {
    return null;
  }
}

function requireStepUp(stepUpToken: string | undefined): void {
  const expected = process.env.FINANCE_STEP_UP_TOKEN;
  if (isStrictDeployEnv(resolveAppEnv())) {
    if (!expected || !stepUpToken || stepUpToken !== expected) {
      throw new PaymentUseCaseError(
        PAYMENT_ERRORS.STEP_UP_REQUIRED.code,
        PAYMENT_ERRORS.STEP_UP_REQUIRED.message,
        PAYMENT_ERRORS.STEP_UP_REQUIRED.status,
      );
    }
    return;
  }
  // Local/test: require non-empty step-up when env is set; else accept any non-empty.
  if (expected) {
    if (stepUpToken !== expected) {
      throw new PaymentUseCaseError(
        PAYMENT_ERRORS.STEP_UP_REQUIRED.code,
        PAYMENT_ERRORS.STEP_UP_REQUIRED.message,
        PAYMENT_ERRORS.STEP_UP_REQUIRED.status,
      );
    }
    return;
  }
  if (!stepUpToken || stepUpToken.length < 4) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.STEP_UP_REQUIRED.code,
      "Header X-Finance-Step-Up requis (min. 4 caractères en local)",
      403,
    );
  }
}

function assertNotFraudHold(userId: string): void {
  if (FRAUD_HOLD_USERS.has(userId)) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.FRAUD_HOLD.code,
      PAYMENT_ERRORS.FRAUD_HOLD.message,
      PAYMENT_ERRORS.FRAUD_HOLD.status,
    );
  }
}

async function assertPayoutVelocity(actorUserId: string): Promise<void> {
  const since = new Date(Date.now() - PAYOUT_VELOCITY_WINDOW_MS);
  // Count recent PAYOUT type txs (actor encoded in reference prefix when present).
  const recent = await paymentRepository.listAllTransactions({
    type: "PAYOUT",
    createdAfter: since,
    take: PAYOUT_VELOCITY_MAX + 5,
  });
  const byActor = recent.filter(
    (t) => t.reference?.includes(`actor:${actorUserId}`) || t.userId === actorUserId,
  );
  if (byActor.length >= PAYOUT_VELOCITY_MAX) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.VELOCITY_LIMIT.code,
      PAYMENT_ERRORS.VELOCITY_LIMIT.message,
      PAYMENT_ERRORS.VELOCITY_LIMIT.status,
    );
  }
}

function toPaymentDetail(t: {
  id: string;
  walletId: string | null;
  amount: { toNumber(): number } | number;
  type: string;
  provider: string | null;
  reference: string | null;
  status: string;
  createdAt: Date;
  checkoutUrl?: string | null;
}): PaymentDetail {
  return {
    id: t.id,
    walletId: t.walletId,
    amount: Number(t.amount),
    type: t.type,
    provider: t.provider,
    reference: t.reference,
    status: String(t.status),
    ...(t.checkoutUrl ? { checkoutUrl: t.checkoutUrl } : {}),
    createdAt: t.createdAt.toISOString(),
  };
}

/**
 * Expire a pending collection checkout: call Fapshi expire-pay then flip local status.
 * Ambiguous provider response → reconciling, no invent SUCCESS.
 */
export async function expirePaymentCommand(input: {
  paymentId: string;
  actorUserId: string;
  stepUpToken?: string;
  reason: string;
  idempotencyKey: string;
}): Promise<PaymentDetail> {
  requireStepUp(input.stepUpToken);
  assertNotFraudHold(input.actorUserId);

  const existing = await paymentRepository.findTransactionByIdempotencyKey(input.idempotencyKey);
  if (existing) return toPaymentDetail(existing);

  const payment = await paymentRepository.findTransactionById(input.paymentId);
  if (!payment) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.code,
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.message,
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.status,
    );
  }
  if (payment.status !== "PENDING" && payment.status !== "CREATED") {
    return toPaymentDetail(payment);
  }

  const transId = payment.providerTransId ?? payment.reference;
  if (transId && payment.serviceKind === "COLLECTION") {
    const remote = await expireCollectionPayment(transId);
    if ("outcome" in remote && remote.outcome === "AMBIGUOUS") {
      await paymentRepository.updateTransactionStatus(payment.id, {
        status: "PENDING",
        internalStatus: "RECONCILING" as never,
      });
      await paymentRepository.createReconciliation({
        paymentId: payment.id,
        status: "MISMATCH",
        notes: `expire_ambiguous:${input.reason}`,
      });
      throw new PaymentUseCaseError(
        PAYMENT_ERRORS.PROVIDER_AMBIGUOUS.code,
        PAYMENT_ERRORS.PROVIDER_AMBIGUOUS.message,
        PAYMENT_ERRORS.PROVIDER_AMBIGUOUS.status,
      );
    }
  }

  const updated = await paymentRepository.updateTransactionStatus(payment.id, {
    status: "EXPIRED",
    internalStatus: "EXPIRED" as never,
    wireStatus: "EXPIRED" as never,
    reference: payment.reference ?? `EXPIRED_BY_${input.actorUserId}`,
  });

  await auditRepository
    .createAuditLog({
      userId: input.actorUserId,
      action: "PAYMENT_EXPIRE",
      entity: "PaymentTransaction",
      entityId: payment.id,
      result: "SUCCESS",
      reason: input.reason,
      metadata: { idempotencyKey: input.idempotencyKey },
    })
    .catch(() => {});

  return toPaymentDetail(updated);
}

/**
 * Maker step: open a signed compensation request (no money moved yet).
 * Fapshi has no native refund — decision is payout / manual / out-of-scope.
 */
export async function requestCompensation(input: {
  paymentId: string;
  actorUserId: string;
  stepUpToken?: string;
  reason: string;
  amount?: number;
  beneficiaryPhone?: string;
  beneficiaryEmail?: string;
  beneficiaryVerified: boolean;
  idempotencyKey: string;
}): Promise<{ reconciliationId: string; decision: "PENDING" }> {
  requireStepUp(input.stepUpToken);
  assertNotFraudHold(input.actorUserId);

  const payment = await paymentRepository.findTransactionById(input.paymentId);
  if (!payment) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.code,
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.message,
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.status,
    );
  }
  if (payment.status !== "SUCCESSFUL") {
    throw new PaymentUseCaseError(
      "FAILED_PRECONDITION",
      "Compensation uniquement sur paiement SUCCESSFUL",
      422,
    );
  }

  const open = await paymentRepository.findOpenReconciliationForPayment(payment.id);
  if (open) {
    const notes = parseNotes(open.notes);
    if (notes?.decision === "PENDING") {
      return { reconciliationId: open.id, decision: "PENDING" };
    }
  }

  const notes: CompensationNotes = {
    kind: "COMPENSATION_REQUEST",
    decision: "PENDING",
    paymentId: payment.id,
    amount: input.amount ?? Number(payment.amount),
    currency: payment.currency,
    reason: input.reason,
    requestedBy: input.actorUserId,
    requestedAt: new Date().toISOString(),
    beneficiaryPhone: input.beneficiaryPhone,
    beneficiaryEmail: input.beneficiaryEmail,
    beneficiaryVerified: input.beneficiaryVerified,
  };

  const row = await paymentRepository.createReconciliation({
    paymentId: payment.id,
    status: "PENDING",
    notes: JSON.stringify(notes),
  });

  await auditRepository
    .createAuditLog({
      userId: input.actorUserId,
      action: "COMPENSATION_REQUEST",
      entity: "PaymentReconciliation",
      entityId: row.id,
      result: "PENDING",
      reason: input.reason,
      metadata: { paymentId: payment.id, idempotencyKey: input.idempotencyKey },
    })
    .catch(() => {});

  return { reconciliationId: row.id, decision: "PENDING" };
}

export type CompensationDecision =
  | "APPROVED_PAYOUT"
  | "APPROVED_MANUAL"
  | "REJECTED"
  | "OUT_OF_SCOPE";

/**
 * Checker step: distinct FINANCE actor decides. Payout path uses PAYOUT credentials only.
 */
export async function decideCompensation(input: {
  reconciliationId: string;
  actorUserId: string;
  stepUpToken?: string;
  decision: CompensationDecision;
  reason: string;
  idempotencyKey: string;
}): Promise<{
  reconciliationId: string;
  decision: CompensationDecision;
  payoutTransactionId?: string;
  outcome: "SUCCESS" | "REFUSED" | "AMBIGUOUS" | "RECORDED";
}> {
  requireStepUp(input.stepUpToken);
  assertNotFraudHold(input.actorUserId);

  const row = await paymentRepository.findReconciliationById(input.reconciliationId);
  if (!row) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.COMPENSATION_NOT_FOUND.code,
      PAYMENT_ERRORS.COMPENSATION_NOT_FOUND.message,
      PAYMENT_ERRORS.COMPENSATION_NOT_FOUND.status,
    );
  }
  const notes = parseNotes(row.notes);
  if (!notes || notes.decision !== "PENDING") {
    throw new PaymentUseCaseError(
      "FAILED_PRECONDITION",
      "Demande de compensation non actionnable",
      422,
    );
  }
  if (notes.requestedBy === input.actorUserId) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.MAKER_CHECKER_REQUIRED.code,
      "Le checker doit être un autre opérateur FINANCE",
      403,
    );
  }

  notes.decision = input.decision;
  notes.approvedBy = input.actorUserId;
  notes.approvedAt = new Date().toISOString();

  if (input.decision === "REJECTED" || input.decision === "OUT_OF_SCOPE") {
    await paymentRepository.updateReconciliation(row.id, {
      status: "RESOLVED",
      notes: JSON.stringify(notes),
      resolvedAt: new Date(),
    });
    await auditRepository
      .createAuditLog({
        userId: input.actorUserId,
        action: "COMPENSATION_DECIDE",
        entity: "PaymentReconciliation",
        entityId: row.id,
        result: input.decision,
        reason: input.reason,
      })
      .catch(() => {});
    return {
      reconciliationId: row.id,
      decision: input.decision,
      outcome: "RECORDED",
    };
  }

  if (input.decision === "APPROVED_MANUAL") {
    // Manual procedure: reverse ledger only when original ledger exists; no provider call.
    const payment = await paymentRepository.findTransactionById(notes.paymentId);
    if (!payment) {
      throw new PaymentUseCaseError(
        PAYMENT_ERRORS.PAYMENT_NOT_FOUND.code,
        PAYMENT_ERRORS.PAYMENT_NOT_FOUND.message,
        PAYMENT_ERRORS.PAYMENT_NOT_FOUND.status,
      );
    }
    const ledger = await paymentRepository.findLedgerEntryByTransactionId(payment.id);
    if (ledger && payment.walletId) {
      const compTx = await paymentRepository.createPaymentTransaction({
        walletId: payment.walletId,
        userId: payment.userId ?? undefined,
        amount: notes.amount,
        type: "COMPENSATION",
        provider: "MANUAL",
        idempotencyKey: input.idempotencyKey,
        status: "SUCCESSFUL",
        internalStatus: "COMPENSATED" as never,
        serviceKind: "COLLECTION" as never,
      });
      const comp = await paymentRepository.createCompensationLedgerEntry({
        originalLedgerId: ledger.id,
        transactionId: compTx.id,
        walletId: payment.walletId,
        amount: notes.amount,
        reason: input.reason,
        idempotencyKey: `${input.idempotencyKey}:ledger`,
      });
      notes.ledgerCompensationId = comp.id;
      notes.payoutTransactionId = compTx.id;
    }
    await paymentRepository.updateReconciliation(row.id, {
      status: "RESOLVED",
      notes: JSON.stringify(notes),
      resolvedAt: new Date(),
    });
    await auditRepository
      .createAuditLog({
        userId: input.actorUserId,
        action: "COMPENSATION_DECIDE",
        entity: "PaymentReconciliation",
        entityId: row.id,
        result: "APPROVED_MANUAL",
        reason: input.reason,
      })
      .catch(() => {});
    return {
      reconciliationId: row.id,
      decision: input.decision,
      payoutTransactionId: notes.payoutTransactionId,
      outcome: "SUCCESS",
    };
  }

  // APPROVED_PAYOUT
  if (!notes.beneficiaryVerified) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.BENEFICIARY_UNVERIFIED.code,
      PAYMENT_ERRORS.BENEFICIARY_UNVERIFIED.message,
      PAYMENT_ERRORS.BENEFICIARY_UNVERIFIED.status,
    );
  }
  if (!notes.beneficiaryPhone && !notes.beneficiaryEmail) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.BENEFICIARY_UNVERIFIED.code,
      "Téléphone ou email bénéficiaire requis pour payout",
      422,
    );
  }

  await assertPayoutVelocity(input.actorUserId);

  const payout = await paymentRepository.createPayoutTransfer({
    amount: notes.amount,
    userId: notes.requestedBy,
    destinationReference: `actor:${input.actorUserId}|comp:${row.id}`,
    idempotencyKey: input.idempotencyKey,
  });

  const providerResult = await executePayout({
    amount: notes.amount,
    phone: notes.beneficiaryPhone,
    email: notes.beneficiaryEmail,
    medium: notes.beneficiaryEmail && !notes.beneficiaryPhone ? "fapshi" : undefined,
    externalId: payout.id,
    userId: notes.requestedBy,
    message: notes.reason,
  });

  if (providerResult.outcome === "AMBIGUOUS") {
    await paymentRepository.updateTransactionStatus(payout.id, {
      status: "PENDING",
      internalStatus: "RECONCILING" as never,
      reference: providerResult.transId,
      provider: "fapshi",
    });
    notes.payoutTransactionId = payout.id;
    notes.decision = "APPROVED_PAYOUT";
    await paymentRepository.updateReconciliation(row.id, {
      status: "MISMATCH",
      notes: JSON.stringify({ ...notes, providerOutcome: "AMBIGUOUS" }),
    });
    await auditRepository
      .createAuditLog({
        userId: input.actorUserId,
        action: "COMPENSATION_PAYOUT",
        entity: "PaymentTransaction",
        entityId: payout.id,
        result: "AMBIGUOUS",
        reason: input.reason,
      })
      .catch(() => {});
    return {
      reconciliationId: row.id,
      decision: input.decision,
      payoutTransactionId: payout.id,
      outcome: "AMBIGUOUS",
    };
  }

  if (providerResult.outcome === "REFUSED") {
    await paymentRepository.updateTransactionStatus(payout.id, {
      status: "FAILED",
      internalStatus: "FAILED" as never,
      reference: providerResult.transId,
    });
    await paymentRepository.updateReconciliation(row.id, {
      status: "MISMATCH",
      notes: JSON.stringify({ ...notes, providerOutcome: "REFUSED" }),
    });
    return {
      reconciliationId: row.id,
      decision: input.decision,
      payoutTransactionId: payout.id,
      outcome: "REFUSED",
    };
  }

  await paymentRepository.updateTransactionStatus(payout.id, {
    status: "SUCCESSFUL",
    internalStatus: "SUCCEEDED" as never,
    reference: providerResult.transId,
    settledAt: new Date(),
  });
  notes.payoutTransactionId = payout.id;
  await paymentRepository.updateReconciliation(row.id, {
    status: "RESOLVED",
    notes: JSON.stringify(notes),
    resolvedAt: new Date(),
  });
  await auditRepository
    .createAuditLog({
      userId: input.actorUserId,
      action: "COMPENSATION_PAYOUT",
      entity: "PaymentTransaction",
      entityId: payout.id,
      result: "SUCCESS",
      reason: input.reason,
    })
    .catch(() => {});

  return {
    reconciliationId: row.id,
    decision: input.decision,
    payoutTransactionId: payout.id,
    outcome: "SUCCESS",
  };
}

/**
 * Direct payout command (prize after publication / ops) — never from provisional score.
 */
export async function financePayoutCommand(input: {
  userId: string;
  amount: number;
  actorUserId: string;
  stepUpToken?: string;
  reason: string;
  beneficiaryPhone?: string;
  beneficiaryEmail?: string;
  beneficiaryVerified: boolean;
  scoresPublished: boolean;
  idempotencyKey: string;
}): Promise<{
  transferId: string;
  outcome: "SUCCESS" | "REFUSED" | "AMBIGUOUS";
  providerTransId?: string;
}> {
  requireStepUp(input.stepUpToken);
  assertNotFraudHold(input.actorUserId);
  assertNotFraudHold(input.userId);

  if (!input.scoresPublished) {
    throw new PaymentUseCaseError(
      "FAILED_PRECONDITION",
      "Payout de gains interdit avant publication explicite des scores",
      403,
    );
  }
  if (!input.beneficiaryVerified) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.BENEFICIARY_UNVERIFIED.code,
      PAYMENT_ERRORS.BENEFICIARY_UNVERIFIED.message,
      PAYMENT_ERRORS.BENEFICIARY_UNVERIFIED.status,
    );
  }
  if (input.amount <= 0) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.INVALID_AMOUNT.code,
      PAYMENT_ERRORS.INVALID_AMOUNT.message,
      PAYMENT_ERRORS.INVALID_AMOUNT.status,
    );
  }

  await assertPayoutVelocity(input.actorUserId);

  const existing = await paymentRepository.findTransactionByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    return {
      transferId: existing.id,
      outcome: existing.status === "SUCCESSFUL" ? "SUCCESS" : existing.status === "FAILED" ? "REFUSED" : "AMBIGUOUS",
      providerTransId: existing.providerTransId ?? existing.reference ?? undefined,
    };
  }

  const payout = await paymentRepository.createPayoutTransfer({
    amount: Math.floor(input.amount),
    userId: input.userId,
    destinationReference: `actor:${input.actorUserId}|${input.reason}`,
    idempotencyKey: input.idempotencyKey,
  });

  const providerResult = await executePayout({
    amount: Math.floor(input.amount),
    phone: input.beneficiaryPhone,
    email: input.beneficiaryEmail,
    medium: input.beneficiaryEmail && !input.beneficiaryPhone ? "fapshi" : undefined,
    externalId: payout.id,
    userId: input.userId,
    message: input.reason,
  });

  if (providerResult.outcome === "AMBIGUOUS") {
    await paymentRepository.updateTransactionStatus(payout.id, {
      status: "PENDING",
      internalStatus: "RECONCILING" as never,
      reference: providerResult.transId,
    });
    await paymentRepository.createReconciliation({
      paymentId: payout.id,
      status: "MISMATCH",
      notes: "payout_ambiguous",
    });
    await auditRepository
      .createAuditLog({
        userId: input.actorUserId,
        action: "FINANCE_PAYOUT",
        entity: "PaymentTransaction",
        entityId: payout.id,
        result: "AMBIGUOUS",
        reason: input.reason,
      })
      .catch(() => {});
    return { transferId: payout.id, outcome: "AMBIGUOUS", providerTransId: providerResult.transId };
  }

  await paymentRepository.updateTransactionStatus(payout.id, {
    status: "SUCCESSFUL",
    internalStatus: "SUCCEEDED" as never,
    reference: providerResult.transId,
    settledAt: new Date(),
  });
  await auditRepository
    .createAuditLog({
      userId: input.actorUserId,
      action: "FINANCE_PAYOUT",
      entity: "PaymentTransaction",
      entityId: payout.id,
      result: "SUCCESS",
      reason: input.reason,
    })
    .catch(() => {});

  return {
    transferId: payout.id,
    outcome: "SUCCESS",
    providerTransId: providerResult.transId,
  };
}

export type DailyFinanceReport = {
  day: string;
  collectionSuccessfulCount: number;
  collectionPendingCount: number;
  collectionFailedCount: number;
  payoutCount: number;
  mismatchCount: number;
  ledgerCredits: number;
  ledgerDebits: number;
  walletBalanceSum: number;
  paidParticipations: number;
  serviceBalanceNote: string;
};

export async function buildDailyFinanceReport(day = new Date()): Promise<DailyFinanceReport> {
  const start = new Date(day);
  start.setUTCHours(0, 0, 0, 0);

  const [
    collectionSuccessfulCount,
    collectionPendingCount,
    collectionFailedCount,
    payoutCount,
    mismatchCount,
    ledgerCredits,
    ledgerDebits,
    walletBalanceSum,
    paidParticipations,
  ] = await Promise.all([
    paymentRepository.countTransactions({ status: "SUCCESSFUL", serviceKind: "COLLECTION" as never, createdAfter: start }),
    paymentRepository.countTransactions({ status: "PENDING", serviceKind: "COLLECTION" as never, createdAfter: start }),
    paymentRepository.countTransactions({ status: "FAILED", serviceKind: "COLLECTION" as never, createdAfter: start }),
    paymentRepository.countTransactions({ type: "PAYOUT", createdAfter: start }),
    paymentRepository.listReconciliations({ status: "MISMATCH", take: 1 }).then(async () => {
      const all = await paymentRepository.listReconciliations({ status: "MISMATCH", take: 500 });
      return all.filter((r) => r.createdAt >= start).length;
    }),
    paymentRepository.sumLedgerCredits({ createdAfter: start }),
    paymentRepository.sumLedgerDebits({ createdAfter: start }),
    paymentRepository.sumWalletBalances(),
    paymentRepository.countPaidParticipations(),
  ]);

  return {
    day: start.toISOString().slice(0, 10),
    collectionSuccessfulCount,
    collectionPendingCount,
    collectionFailedCount,
    payoutCount,
    mismatchCount,
    ledgerCredits,
    ledgerDebits,
    walletBalanceSum,
    paidParticipations,
    serviceBalanceNote:
      "Solde service Fapshi non exposé par API unifiée — rapprocher manuellement dashboard service COLLECTION vs PAYOUT.",
  };
}

export async function listFinanceMismatches(input: {
  skip?: number;
  take?: number;
}): Promise<
  Array<{
    id: string;
    paymentId: string;
    status: string;
    notes: string | null;
    createdAt: string;
  }>
> {
  const rows = await paymentRepository.listReconciliations({
    status: "MISMATCH",
    skip: input.skip,
    take: input.take,
  });
  return rows.map((r) => ({
    id: r.id,
    paymentId: r.paymentId,
    status: r.status,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Provider-driven reconciliation slice used by worker and manual finance trigger.
 * Never marks SUCCESS without official SUCCESSFUL + amount match when amount present.
 */
export async function reconcileAgainstProvider(paymentId: string): Promise<{
  paymentId: string;
  localStatus: string;
  providerStatus: FapshiWireStatusName | null;
  match: boolean;
  action: string;
}> {
  const payment = await paymentRepository.findTransactionById(paymentId);
  if (!payment) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.code,
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.message,
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.status,
    );
  }

  const transId = payment.providerTransId;
  if (!transId) {
    await paymentRepository.createReconciliation({
      paymentId: payment.id,
      status: "MISMATCH",
      notes: "missing_provider_trans_id",
    });
    return {
      paymentId: payment.id,
      localStatus: payment.status,
      providerStatus: null,
      match: false,
      action: "MISMATCH_NO_TRANS_ID",
    };
  }

  let remote: Awaited<ReturnType<typeof getCollectionPaymentStatus>>;
  try {
    remote = await getCollectionPaymentStatus(transId);
  } catch {
    await paymentRepository.createReconciliation({
      paymentId: payment.id,
      status: "MISMATCH",
      notes: "provider_status_unreachable",
    });
    return {
      paymentId: payment.id,
      localStatus: payment.status,
      providerStatus: "UNKNOWN",
      match: false,
      action: "PROVIDER_UNREACHABLE",
    };
  }

  if (remote.status === "UNKNOWN") {
    await paymentRepository.createReconciliation({
      paymentId: payment.id,
      status: "MISMATCH",
      notes: "provider_status_unknown",
    });
    return {
      paymentId: payment.id,
      localStatus: payment.status,
      providerStatus: "UNKNOWN",
      match: false,
      action: "UNKNOWN_WIRE",
    };
  }

  const amountOk =
    remote.amount === undefined || remote.amount === Number(payment.amount);

  if (remote.status === "SUCCESSFUL" && payment.status === "PENDING" && amountOk) {
    // Do not settle here without inbox — mark for operator apply path
    await paymentRepository.createReconciliation({
      paymentId: payment.id,
      status: "MISMATCH",
      notes: `provider_successful_local_pending:wire=${remote.status}`,
    });
    await paymentRepository.updateTransactionStatus(payment.id, {
      status: "PENDING",
      internalStatus: "RECONCILING" as never,
      wireStatus: wireStatusToEnum(remote.status) as never,
    });
    return {
      paymentId: payment.id,
      localStatus: payment.status,
      providerStatus: remote.status,
      match: false,
      action: "NEEDS_SETTLEMENT",
    };
  }

  if (remote.status === "EXPIRED" && payment.status === "PENDING") {
    await paymentRepository.updateTransactionStatus(payment.id, {
      status: "EXPIRED",
      internalStatus: "EXPIRED" as never,
      wireStatus: "EXPIRED" as never,
    });
    await paymentRepository.createReconciliation({
      paymentId: payment.id,
      status: "MATCHED",
      notes: "expired_synced",
    });
    return {
      paymentId: payment.id,
      localStatus: "EXPIRED",
      providerStatus: "EXPIRED",
      match: true,
      action: "EXPIRED_SYNCED",
    };
  }

  if (remote.status === "FAILED" && payment.status === "PENDING") {
    await paymentRepository.updateTransactionStatus(payment.id, {
      status: "FAILED",
      internalStatus: "FAILED" as never,
      wireStatus: "FAILED" as never,
    });
    await paymentRepository.createReconciliation({
      paymentId: payment.id,
      status: "MATCHED",
      notes: "failed_synced",
    });
    return {
      paymentId: payment.id,
      localStatus: "FAILED",
      providerStatus: "FAILED",
      match: true,
      action: "FAILED_SYNCED",
    };
  }

  const match =
    (remote.status === "SUCCESSFUL" && payment.status === "SUCCESSFUL" && amountOk) ||
    (remote.status === "PENDING" && payment.status === "PENDING") ||
    (remote.status === "FAILED" && payment.status === "FAILED") ||
    (remote.status === "EXPIRED" && payment.status === "EXPIRED");

  if (!match || !amountOk) {
    await paymentRepository.createReconciliation({
      paymentId: payment.id,
      status: "MISMATCH",
      notes: `local=${payment.status};wire=${remote.status};amountOk=${amountOk}`,
    });
  } else {
    await paymentRepository.createReconciliation({
      paymentId: payment.id,
      status: "MATCHED",
      notes: "provider_match",
    });
  }

  return {
    paymentId: payment.id,
    localStatus: payment.status,
    providerStatus: remote.status,
    match: match && amountOk,
    action: match && amountOk ? "MATCHED" : "MISMATCH",
  };
}

export async function listFinanceWallets(input: { skip?: number; take?: number }) {
  const wallets = await paymentRepository.listWallets(input);
  return wallets.map((w) => ({
    id: w.id,
    userId: w.userId,
    balance: Number(w.balance),
    currency: w.currency,
    isFrozen: w.isFrozen,
    version: w.version,
    updatedAt: w.updatedAt.toISOString(),
  }));
}
