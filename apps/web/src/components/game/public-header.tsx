"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/retroui/button";
import { Badge } from "@/components/retroui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/retroui/sheet";

const navItems = [
  { href: "/", label: "Accueil" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/notifications", label: "Notifications" },
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-3" aria-label="Session Jeu accueil">
          <span className="grid size-10 place-items-center border-2 border-border bg-primary font-head text-lg font-black shadow-md transition-transform group-hover:-rotate-3">
            SJ
          </span>
          <span className="font-head text-xl font-black uppercase tracking-tight">Session Jeu</span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex" aria-label="Navigation principale">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="border-2 border-transparent px-3 py-1 font-head text-sm font-bold uppercase hover:border-border hover:bg-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Badge variant="outline">Invité</Badge>
          <Link
            href="/auth/login"
            className="font-head text-sm font-bold uppercase underline decoration-2 underline-offset-4"
          >
            Connexion
          </Link>
          <Link href="/auth/register">
            <Button size="sm">Créer compte</Button>
          </Link>
        </div>

        <Sheet>
          <SheetTrigger className="md:hidden" render={<Button variant="outline" size="icon" />}>
            <Menu />
            <span className="sr-only">Ouvrir le menu</span>
          </SheetTrigger>
          <SheetContent side="right" className="border-l-2 border-border bg-background">
            <SheetHeader>
              <SheetTitle className="font-head text-2xl font-black uppercase">
                Session Jeu
              </SheetTitle>
            </SheetHeader>
            <nav className="grid gap-3 p-4" aria-label="Navigation mobile">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="border-2 border-border bg-card px-4 py-3 font-head text-lg font-black uppercase shadow-md"
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/auth/register">
                <Button className="w-full" size="lg">
                  Créer compte
                </Button>
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
