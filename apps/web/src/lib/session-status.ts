export type PublicSessionStatus =
  "DRAFT" | "PUBLISHED" | "ACTIVE" | "WAITING_START" | "LIVE" | "COMPLETED" | "CANCELLED";

export function sessionStatusLabel(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Brouillon";
    case "PUBLISHED":
      return "Programmée";
    case "ACTIVE":
      return "Inscriptions ouvertes";
    case "WAITING_START":
      return "Check-in bientôt";
    case "LIVE":
      return "En direct";
    case "COMPLETED":
      return "Terminée";
    case "CANCELLED":
      return "Annulée";
    default:
      return status;
  }
}

export function sessionStatusTone(status: string): "default" | "secondary" | "destructive" {
  switch (status) {
    case "ACTIVE":
    case "LIVE":
      return "default";
    case "COMPLETED":
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

export function canRegisterForSession(status: string): boolean {
  return status === "ACTIVE";
}
