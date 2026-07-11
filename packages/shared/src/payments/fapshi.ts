export function hasVerifiedFapshiSuccessAmount(input: {
  status: string;
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
