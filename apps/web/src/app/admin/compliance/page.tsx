import type { Metadata } from "next";
import { adminApiGet } from "../admin-api";
import type { ComplianceGate, ComplianceGateStatus } from "../admin-types";
import { ComplianceGateActions } from "@/components/admin/ComplianceGateActions";
import { Badge } from "@/components/retroui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";

export const metadata: Metadata = {
  title: "Conformite | Admin",
};

const STATUS_LABEL: Record<ComplianceGateStatus, string> = {
  BLOCKED: "Bloque",
  PASSED: "Valide",
  WAIVED: "Deroge",
};

const STATUS_VARIANT: Record<ComplianceGateStatus, "destructive" | "default" | "outline"> = {
  BLOCKED: "destructive",
  PASSED: "default",
  WAIVED: "outline",
};

export default async function AdminCompliancePage() {
  const result = await adminApiGet<{ gates: ComplianceGate[] }>("/v1/admin/compliance/gates");
  const gates = result?.gates ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="outline">Conformite</Badge>
        <h1 className="mt-2 text-3xl font-black uppercase">Gates de conformite</h1>
        <p className="text-sm text-muted-foreground">
          {gates.length
            ? `${gates.length} gate(s) — une session publique reste bloquee tant qu'un gate est Bloque.`
            : "Donnees indisponibles"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-head text-lg uppercase">Gates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {gates.length === 0 ? (
            <p className="text-muted-foreground">Aucun gate.</p>
          ) : (
            gates.map((gate) => (
              <div
                key={gate.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-semibold">
                    {gate.type} <span className="text-muted-foreground">({gate.scope})</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{gate.reason}</p>
                  <div className="mt-1">
                    <Badge variant={STATUS_VARIANT[gate.status]}>{STATUS_LABEL[gate.status]}</Badge>
                  </div>
                </div>
                <ComplianceGateActions gate={gate} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
