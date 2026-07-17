"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, RefreshCw } from "lucide-react";
import {
  acquireControlLease,
  getControlLease,
  releaseControlLease,
} from "@/services/admin/adminPartyClient";
import { AdminSection, AdminStatus } from "@/components/admin/AdminWorkspace";
import { Button } from "@/components/ui/button";

type Props = {
  partyId: string;
};

export function AdminControlLeasePanel({ partyId }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["admin", "lease", partyId] as const;

  const leaseQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await getControlLease(partyId);
      if (!res.success) throw new Error(`${res.error.code}: ${res.error.message}`);
      return res.data;
    },
    refetchInterval: 10_000,
    retry: 1,
  });

  const acquireMutation = useMutation({
    mutationFn: async () => {
      const res = await acquireControlLease(partyId);
      if (!res.success) throw new Error(`${res.error.code}: ${res.error.message}`);
      return res.data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const releaseMutation = useMutation({
    mutationFn: async () => {
      const res = await releaseControlLease(partyId);
      if (!res.success) throw new Error(`${res.error.code}: ${res.error.message}`);
      return res.data;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const lease = leaseQuery.data;
  const error =
    leaseQuery.error instanceof Error
      ? leaseQuery.error.message
      : acquireMutation.error instanceof Error
        ? acquireMutation.error.message
        : releaseMutation.error instanceof Error
          ? releaseMutation.error.message
          : null;

  return (
    <AdminSection
      title="Lease de contrôle"
      description="Les commandes sensibles exigent un lease exclusif. Deux admins ne peuvent pas écraser silencieusement."
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={() => void leaseQuery.refetch()}
          disabled={leaseQuery.isFetching}
        >
          <RefreshCw size={14} />
          Actualiser
        </Button>
      }
    >
      <div className="space-y-3 p-4 text-sm">
        {leaseQuery.isLoading ? (
          <p className="text-muted-foreground">Chargement du lease…</p>
        ) : leaseQuery.isError ? (
          <p className="text-rose-300" role="alert">
            Impossible de lire le lease: {error}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <KeyRound size={16} className="text-cyan-400" aria-hidden />
              {lease?.heldByCaller ? (
                <AdminStatus tone="success">Détenu par vous</AdminStatus>
              ) : lease?.holderUserId ? (
                <AdminStatus tone="warning">Détenu par un autre admin</AdminStatus>
              ) : (
                <AdminStatus tone="neutral">Libre</AdminStatus>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Détenteur: {lease?.holderUserId ?? "—"} · Expire:{" "}
              {lease?.expiresAt ? new Date(lease.expiresAt).toLocaleString() : "—"}
            </p>
          </>
        )}
        {error && !leaseQuery.isError ? (
          <p className="text-xs text-rose-300" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => acquireMutation.mutate()}
            disabled={acquireMutation.isPending || Boolean(lease?.heldByCaller)}
          >
            Acquérir le lease
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => releaseMutation.mutate()}
            disabled={releaseMutation.isPending || !lease?.heldByCaller}
          >
            Libérer
          </Button>
        </div>
      </div>
    </AdminSection>
  );
}
