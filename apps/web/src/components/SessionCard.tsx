import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SessionCardProps {
  code: string;
  name: string;
  description: string | null;
  entryFee: number;
  maxPlayers: number;
  prizePool: number;
  startTime: string | null;
  status: string;
  placesRemaining: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Date à confirmer";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string): string {
  switch (status) {
    case "PUBLISHED":
      return "Inscriptions ouvertes";
    case "ACTIVE":
      return "En cours";
    case "COMPLETED":
      return "Terminée";
    case "CANCELLED":
      return "Annulée";
    default:
      return status;
  }
}

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  switch (status) {
    case "PUBLISHED":
      return "default";
    case "ACTIVE":
      return "secondary";
    case "COMPLETED":
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

export default function SessionCard({
  code,
  name,
  description,
  entryFee,
  startTime,
  status,
  placesRemaining,
}: SessionCardProps) {
  const isFull = placesRemaining <= 0;
  const isClosed = status === "COMPLETED" || status === "CANCELLED";

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{name}</CardTitle>
          <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {description && (
          <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
            {description}
          </p>
        )}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span>{formatDate(startTime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Inscription</span>
            <span>{formatCurrency(entryFee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Places restantes</span>
            <span>
              {isFull ? (
                <span className="font-medium text-destructive">Complet</span>
              ) : (
                <span className="font-medium">{placesRemaining} place(s)</span>
              )}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/session/${code}`} className="w-full">
          <Button className="w-full" disabled={isFull || isClosed}>
            {isFull ? "Session complète" : isClosed ? "Session terminée" : "Voir les détails"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
