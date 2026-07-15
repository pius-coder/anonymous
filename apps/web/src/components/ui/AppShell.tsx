import type { ReactNode } from "react";

type AppShellProps = {
  audience: "Joueur" | "Admin" | "Observateur";
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AppShell({ audience, eyebrow, title, subtitle, actions, children }: AppShellProps) {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {subtitle ? <p className="app-subtitle">{subtitle}</p> : null}
        </div>
        <div className="app-header-actions">
          <span className="audience-pill">{audience}</span>
          {actions}
        </div>
      </header>
      <div className="app-content">{children}</div>
    </main>
  );
}

