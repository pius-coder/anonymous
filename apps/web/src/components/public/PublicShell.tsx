import Link from "next/link";
import { Gamepad2, LogIn, Sparkles, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh overflow-y-auto bg-background text-foreground" data-scroll-region="public-page">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link className="brand-lockup" href="/" aria-label="Noya, accueil">
            <span className="brand-mark" aria-hidden="true"><Sparkles /></span>
            <span className="brand-copy"><strong>NOYA</strong><small>PLAY TOGETHER</small></span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Navigation publique">
            <Button variant="ghost" render={<Link href="/parties" />}>
              <Gamepad2 /> <span className="hidden sm:inline">Parties</span>
            </Button>
            <Button variant="outline" render={<Link href="/auth/login" />}>
              <LogIn /> <span className="hidden sm:inline">Connexion</span>
            </Button>
            <Button render={<Link href="/auth/register" />}>
              <UserPlus /> <span className="hidden sm:inline">Créer un compte</span>
            </Button>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
