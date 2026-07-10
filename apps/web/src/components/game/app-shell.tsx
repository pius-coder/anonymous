import { PublicHeader } from "./public-header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background game-surface">
      <PublicHeader />
      <main className="relative z-10 flex-1">{children}</main>
      <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">
          Session Jeu &copy; {new Date().getFullYear()} · Plateforme de compétitions stratégiques
        </div>
      </footer>
    </div>
  );
}
