import { RefreshCw, Wifi, WifiOff } from "lucide-react";

export type ConnectionState = "stable" | "stale" | "reconnecting" | "offline";

const connectionCopy: Record<ConnectionState, string> = {
  stable: "Live stable",
  stale: "Donnees obsoletes",
  reconnecting: "Reconnexion en cours",
  offline: "Live indisponible",
};

export function ConnectionStatus({ state }: { state: ConnectionState }) {
  const Icon = state === "stable" ? Wifi : state === "reconnecting" ? RefreshCw : WifiOff;

  return (
    <span className={`connection-status connection-status--${state}`} role="status">
      <Icon aria-hidden="true" size={16} />
      {connectionCopy[state]}
    </span>
  );
}

