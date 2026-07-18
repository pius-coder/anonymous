import type { ReactNode } from "react";
import { RoleGate } from "@/components/auth/RoleGate";

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return <RoleGate roles={["FINANCE", "SUPER_ADMIN"]}>{children}</RoleGate>;
}
