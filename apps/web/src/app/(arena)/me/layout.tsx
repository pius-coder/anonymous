"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/me", label: "Profil" },
  { href: "/me/sessions", label: "Mes sessions" },
];

export default function MeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="px-4 py-6 sm:px-6">
      <nav className="mb-6 flex gap-2 border-b-2 border-border" aria-label="Mon compte">
        {TABS.map((tab) => {
          const active =
            tab.href === "/me" ? pathname === "/me" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "border-b-2 px-4 py-2 font-head text-sm font-bold uppercase transition-colors",
                active
                  ? "border-[--arena-pink] text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
