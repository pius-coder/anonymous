/**
 * Server-authoritative payment amounts.
 * Clients may suggest an amount only for TOP_UP; ACCESS_FEE always uses the catalog.
 * Prize credits are never resolved here — publication is a separate domain.
 */

export type PaymentPurpose = "ACCESS_FEE" | "TOP_UP";

const DEFAULT_ACCESS_FEE_XAF = 2_500;
const MAX_TOP_UP_XAF = 5_000_000;
const MIN_TOP_UP_XAF = 100;

function accessFeeCatalog(): Record<string, number> {
  return {
    DEFAULT: Number(process.env.PAYMENT_ACCESS_FEE_XAF ?? DEFAULT_ACCESS_FEE_XAF),
    "SEED-PARTY-01": Number(process.env.PAYMENT_SEED_PARTY_FEE_XAF ?? 1_000),
  };
}

export function resolveServerAmount(input: {
  purpose: PaymentPurpose;
  productCode?: string;
  requestedAmount?: number;
}): number {
  if (input.purpose === "ACCESS_FEE") {
    const catalog = accessFeeCatalog();
    const key =
      input.productCode && catalog[input.productCode] !== undefined
        ? input.productCode
        : "DEFAULT";
    const amount = catalog[key] ?? catalog.DEFAULT;
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("INVALID_SERVER_AMOUNT");
    }
    return Math.floor(amount);
  }

  const requested = input.requestedAmount;
  if (requested === undefined || !Number.isFinite(requested) || requested <= 0) {
    throw new Error("INVALID_AMOUNT");
  }
  const units = Math.floor(requested);
  if (units < MIN_TOP_UP_XAF || units > MAX_TOP_UP_XAF) {
    throw new Error("INVALID_AMOUNT");
  }
  return units;
}

export function getAccessFeeCatalogSnapshot(): Readonly<Record<string, number>> {
  return { ...accessFeeCatalog() };
}
