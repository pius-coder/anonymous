import { PublicHeader } from "@/components/game/public-header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background game-surface">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md border-2 border-border bg-card p-6 shadow-md sm:p-8">{children}</div>
      </main>
    </div>
  );
}
