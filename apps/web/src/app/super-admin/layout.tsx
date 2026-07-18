import type { ReactNode } from "react";
import { RoleGate } from "@/components/auth/RoleGate";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return <RoleGate roles={["SUPER_ADMIN"]}>{children}</RoleGate>;
}
