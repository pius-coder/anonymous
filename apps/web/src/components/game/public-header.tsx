"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut, Menu, User as UserIcon, X } from "lucide-react";
import { Button } from "@/components/retroui/button";
import { Badge } from "@/components/retroui/badge";
import { MinidenticonAvatar } from "@/components/retroui/avatar";
import { AuthDrawer } from "@/components/auth/AuthDrawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/retroui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";

const navItems = [
  { href: "/", label: "Accueil" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/notifications", label: "Notifications" },
];

export function PublicHeader() {
  const { user, loading, logout } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    setMobileMenuOpen(false);
    await logout();
    router.push("/");
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 md:px-5">
      <div className="premium-toolbar mx-auto flex max-w-7xl items-center justify-between gap-4 px-3 py-2.5 sm:px-4">
        <Link href="/" className="group flex items-center gap-3" aria-label="Session Jeu accueil">
          <span className="grid size-10 place-items-center rounded-2xl border border-primary/45 bg-primary/20 font-head text-lg font-black text-primary shadow-[0_0_26px_rgba(237,27,118,.2)] transition-transform group-hover:-rotate-3">
            SJ
          </span>
          <span className="font-head text-xl font-black uppercase tracking-tight">Session Jeu</span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex" aria-label="Navigation principale">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-transparent px-3 py-2 font-head text-xs font-bold uppercase tracking-wide text-white/65 hover:border-white/10 hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {loading ? (
            <Badge variant="outline">…</Badge>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <MinidenticonAvatar seed={user.username ?? user.email} size="default" />
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-head text-sm font-bold normal-case">
                    {user.name ?? user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    {user.email}
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/me" />}>
                  <UserIcon className="size-4" />
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/me/sessions" />}>
                  Mes sessions
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                  <LogOut className="size-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <AuthDrawer
                defaultTab="login"
                trigger={
                  <button
                    className="font-head text-sm font-bold uppercase underline decoration-2 underline-offset-4"
                    type="button"
                  >
                    Connexion
                  </button>
                }
              />
              <AuthDrawer defaultTab="register" trigger={<Button size="sm">Créer compte</Button>} />
            </>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="md:hidden"
          aria-controls="mobile-public-menu"
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {mobileMenuOpen ? (
        <div
          id="mobile-public-menu"
          className="mx-3 mt-2 rounded-2xl border border-white/12 bg-[--surface-overlay] shadow-[var(--shadow-overlay)] backdrop-blur-xl md:hidden"
        >
          <nav className="mx-auto grid max-w-7xl gap-3 px-4 py-4" aria-label="Navigation mobile">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-head text-sm font-black uppercase shadow-sm transition-colors hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <div className="grid gap-3">
                <Link href="/me" onClick={closeMobileMenu}>
                  <Button className="w-full" size="lg" variant="outline">
                    Profil
                  </Button>
                </Link>
                <Link href="/me/sessions" onClick={closeMobileMenu}>
                  <Button className="w-full" size="lg">
                    Mes sessions
                  </Button>
                </Link>
                <Button className="w-full" size="lg" variant="ghost" onClick={handleLogout}>
                  Déconnexion
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                <AuthDrawer
                  defaultTab="login"
                  trigger={
                    <Button className="w-full" size="lg" variant="outline">
                      Connexion
                    </Button>
                  }
                />
                <AuthDrawer
                  defaultTab="register"
                  trigger={
                    <Button className="w-full" size="lg">
                      Créer compte
                    </Button>
                  }
                />
              </div>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
