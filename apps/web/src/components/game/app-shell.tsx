import { PublicHeader } from "./public-header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background game-surface">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t-2 border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">
          Session Jeu &copy; {new Date().getFullYear()} · Plateforme de compétitions stratégiques
        </div>
      </footer>
    </div>
  );
}
