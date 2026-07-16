import type { ReactNode } from "react";
import { RoleGate } from "@/components/auth/RoleGate";

export default function ObserveLayout({ children }: { children: ReactNode }) {
  return <RoleGate roles={["OBSERVER", "SUPPORT", "ADMIN", "SUPER_ADMIN"]}>{children}</RoleGate>;
}
