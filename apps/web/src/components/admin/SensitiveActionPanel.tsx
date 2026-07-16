"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SensitiveActionPanelProps = {
  title: string;
  description: string;
  actionLabel: string;
  consequence: string;
  disabled?: boolean;
  disabledReason?: string;
  tone?: "default" | "danger";
};

export function SensitiveActionPanel({
  title,
  description,
  actionLabel,
  consequence,
  disabled = false,
  disabledReason,
  tone = "default",
}: SensitiveActionPanelProps) {
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const ready = reason.trim().length >= 12 && confirmed && !disabled;

  return (
    <section
      className="border border-border bg-card p-4"
      aria-labelledby={`sensitive-${actionLabel.replaceAll(" ", "-")}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 grid size-8 shrink-0 place-items-center border ${tone === "danger" ? "border-rose-700 bg-rose-950 text-rose-300" : "border-amber-700 bg-amber-950 text-amber-200"}`}
        >
          {disabled ? <LockKeyhole size={16} /> : <AlertTriangle size={16} />}
        </span>
        <div>
          <h2
            id={`sensitive-${actionLabel.replaceAll(" ", "-")}`}
            className="text-sm font-semibold"
          >
            {title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`reason-${actionLabel}`}>Raison d’audit obligatoire</Label>
          <Textarea
            id={`reason-${actionLabel}`}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setSubmitted(false);
            }}
            placeholder="Décrire le contexte et la décision (12 caractères minimum)"
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            {reason.trim().length}/12 caractères minimum
          </p>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox
            id={`confirm-${actionLabel}`}
            checked={confirmed}
            onCheckedChange={(value) => {
              setConfirmed(value === true);
              setSubmitted(false);
            }}
            disabled={disabled}
          />
          <Label htmlFor={`confirm-${actionLabel}`} className="text-xs font-normal leading-5">
            Je confirme: {consequence}
          </Label>
        </div>
        {disabledReason ? (
          <p
            className="border border-amber-800 bg-amber-950/40 px-3 py-2 text-xs text-amber-200"
            role="status"
          >
            Bloqué: {disabledReason}
          </p>
        ) : null}
        {submitted ? (
          <p className="flex items-center gap-2 text-xs text-emerald-300" role="status">
            <CheckCircle2 size={15} />
            Commande simulée et prête à être envoyée au service autoritaire.
          </p>
        ) : null}
        <Button
          variant={tone === "danger" ? "destructive" : "default"}
          disabled={!ready}
          onClick={() => setSubmitted(true)}
        >
          {actionLabel}
        </Button>
      </div>
    </section>
  );
}
