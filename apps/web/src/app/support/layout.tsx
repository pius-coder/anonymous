import type { ReactNode } from "react";
import { RoleGate } from "@/components/auth/RoleGate";

export default function SupportLayout({ children }: { children: ReactNode }) {
  return <RoleGate roles={["SUPPORT", "SUPER_ADMIN"]}>{children}</RoleGate>;
}
