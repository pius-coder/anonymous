export function formatDateTime(value: string | null | undefined) {
  if (!value) return "Non defini";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatXaf(value: number | null | undefined, currency = "XAF") {
  return `${new Intl.NumberFormat("fr-FR").format(value ?? 0)} ${currency}`;
}

export function shortId(value: string | null | undefined, size = 8) {
  if (!value) return "Non renseigne";
  if (value.length <= size * 2 + 1) return value;
  return `${value.slice(0, size)}...${value.slice(-4)}`;
}

export function jsonPreview(value: unknown) {
  if (value === null || value === undefined) return "Non expose";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "JSON indisponible";
  }
}
