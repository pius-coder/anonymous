"use client";

import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { AppShell } from "@/components/ui/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/PageState";
import { paymentApi } from "@/services/payment/payment-api";

export default function ExportPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await paymentApi.exportPlayerTransactions();
      if (!res.success) {
        setError(res.error.message);
        setStatus("error");
        return;
      }
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-transactions-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'export");
      setStatus("error");
    }
  }, []);

  return (
    <AppShell
      audience="Joueur"
      eyebrow="Mon argent"
      title="Exporter les transactions"
      subtitle="Téléchargez l'historique complet de vos transactions"
      actions={
        <Button render={<Link href="/me/wallet" />} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Export JSON</CardTitle>
          <CardDescription>Toutes vos transactions dans un fichier JSON structuré.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleExport} disabled={status === "loading"}>
            {status === "loading" ? (
              "Export en cours…"
            ) : (
              <>
                <Download className="h-4 w-4" /> Télécharger
              </>
            )}
          </Button>

          {status === "success" ? (
            <PageState
              kind="success"
              title="Export réussi"
              message="Le fichier a été téléchargé."
            />
          ) : null}

          {status === "error" ? (
            <PageState kind="error" title="Échec de l'export" message={error ?? ""} />
          ) : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}
