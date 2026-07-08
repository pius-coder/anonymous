import Link from "next/link";
import { Badge } from "@/components/retroui/badge";
import { buttonVariants } from "@/components/retroui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/retroui/card";
import { Progress } from "@/components/retroui/progress";
import { cn } from "@/lib/utils";

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
  maxPlayers,
  startTime,
  status,
  placesRemaining,
}: SessionCardProps) {
  const isFull = placesRemaining <= 0;
  const isClosed = status === "COMPLETED" || status === "CANCELLED";
  const filledSeats = Math.max(0, maxPlayers - placesRemaining);
  const fillPercent =
    maxPlayers > 0 ? Math.min(100, Math.round((filledSeats / maxPlayers) * 100)) : 0;

  return (
    <Card className="relative flex min-h-full flex-col border-2 border-border bg-card shadow-lg transition-transform hover:-translate-y-1">
      <CardHeader>
        <CardTitle className="font-head text-xl uppercase">{name}</CardTitle>
        <CardAction>
          <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1 space-y-5">
        {description && (
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{description}</p>
        )}
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Date</span>
            <span className="text-right font-medium">{formatDate(startTime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Inscription</span>
            <span className="font-mono font-black tabular-nums">{formatCurrency(entryFee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Capacité</span>
            <span>
              {isFull ? (
                <span className="font-medium text-destructive">Complet</span>
              ) : (
                <span className="font-medium">
                  {filledSeats}/{maxPlayers} joueurs
                </span>
              )}
            </span>
          </div>
          <Progress value={fillPercent} aria-label="Remplissage de la session" />
        </div>
      </CardContent>
      <CardFooter>
        {isFull || isClosed ? (
          <span className={cn(buttonVariants(), "w-full opacity-60")} aria-disabled="true">
            {isFull ? "Session complète" : isClosed ? "Session terminée" : "Voir les détails"}
          </span>
        ) : (
          <Link href={`/session/${code}`} className={cn(buttonVariants(), "w-full")}>
            Voir les détails
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
