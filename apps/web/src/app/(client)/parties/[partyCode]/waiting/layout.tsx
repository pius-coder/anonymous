import type { ReactNode } from "react";
import { RoleGate } from "@/components/auth/RoleGate";

export default function WaitingLayout({ children }: { children: ReactNode }) {
  return <RoleGate roles={["PLAYER", "ADMIN", "SUPER_ADMIN"]}>{children}</RoleGate>;
}
