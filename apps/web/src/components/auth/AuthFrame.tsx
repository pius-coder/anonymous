import Link from "next/link";
import { Gamepad2, ShieldCheck, Sparkles, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="auth-screen">
      <section className="auth-story">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark"><Sparkles /></span>
          <span className="brand-copy"><strong>NOYA</strong><small>PLAY TOGETHER</small></span>
        </Link>
        <div className="auth-story-copy">
          <p className="app-eyebrow">Votre prochaine aventure</p>
          <h1>Un seul compte.<br />Toutes vos rooms.</h1>
          <p>Rejoignez des sessions sociales, jouez des manches live et retrouvez vos résultats vérifiés.</p>
        </div>
        <div className="auth-benefits">
          <span><Gamepad2 /><strong>Mini-jeux live</strong></span>
          <span><Users /><strong>Rooms sociales 2D</strong></span>
          <span><ShieldCheck /><strong>Paiements tracés</strong></span>
        </div>
      </section>
      <section className="auth-form-column">
        <Card className="auth-card">
          <CardHeader><CardTitle className="font-head text-2xl">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </section>
    </main>
  );
}
