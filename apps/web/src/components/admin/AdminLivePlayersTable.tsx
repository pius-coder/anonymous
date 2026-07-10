import type { AdminSessionDetail } from "@/services/admin/types";
import { formatDateTime } from "@/app/admin/admin-format";
import { Badge } from "@/components/retroui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/retroui/table";

export function AdminLivePlayersTable({ session }: { session: AdminSessionDetail }) {
  if (session.registrations.length === 0) return <p className="text-muted-foreground">Aucun joueur inscrit.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Joueur</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Check-in</TableHead>
          <TableHead>Room</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {session.registrations.map((registration) => (
          <TableRow key={registration.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="grid size-9 overflow-hidden border-2 border-border bg-muted">
                  {registration.user.profile?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={registration.user.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="place-self-center font-head text-xs">
                      {(registration.user.profile?.username ?? registration.user.name ?? "P").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium">{registration.user.profile?.username ?? registration.user.name ?? registration.user.email}</p>
                  <p className="text-xs text-muted-foreground">{registration.user.email}</p>
                </div>
              </div>
            </TableCell>
            <TableCell><Badge variant="outline">{registration.status}</Badge></TableCell>
            <TableCell>{formatDateTime(registration.checkedInAt)}</TableCell>
            <TableCell>{formatDateTime(registration.inRoomAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
