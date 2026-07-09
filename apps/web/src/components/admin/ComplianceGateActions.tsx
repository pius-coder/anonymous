"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch } from "@/lib/api";
import type { ComplianceGate, ComplianceGateStatus } from "@/app/admin/admin-types";
import { Button } from "@/components/retroui/button";

const STATUS_LABEL: Record<ComplianceGateStatus, string> = {
  BLOCKED: "Bloque",
  PASSED: "Valide",
  WAIVED: "Deroge",
};

export function ComplianceGateActions({ gate }: { gate: ComplianceGate }) {
  const router = useRouter();
  const [busy, setBusy] = useState<ComplianceGateStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function decide(status: ComplianceGateStatus) {
    setBusy(status);
    setMessage(null);
    const result = await apiPatch<{ gate: ComplianceGate }>(
      `/admin/compliance/gates/${gate.id}`,
      { status },
    );
    setBusy(null);
    if (!result.ok) {
      setMessage(`${result.error.code}: ${result.error.message}`);
      return;
    }
    setMessage(`Gate ${gate.type} → ${STATUS_LABEL[status]}`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {gate.status === "BLOCKED" ? (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => decide("PASSED")}
          >
            Valider
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => decide("WAIVED")}
          >
            Deroger
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="destructive"
          disabled={busy !== null}
          onClick={() => decide("BLOCKED")}
        >
          Re-bloquer
        </Button>
      )}
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </div>
  );
}
