"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight } from "lucide-react";
import { useSession } from "@/lib/useSession";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const { login, error } = useSession({ refreshOnMount: false });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await login(email, password);
      if (response.success) {
        const requestedPath = new URLSearchParams(window.location.search).get("returnTo");
        router.push(requestedPath?.startsWith("/") ? requestedPath : homeForRoles(response.data.user.roles));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error ? <Alert variant="destructive"><AlertCircle /><AlertDescription>{error}</AlertDescription></Alert> : null}
      <div className="auth-field"><Label htmlFor="email">Adresse email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@exemple.com" required /></div>
      <div className="auth-field"><div className="auth-label-row"><Label htmlFor="password">Mot de passe</Label><Link href="/auth/reset">Mot de passe oublié ?</Link></div><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
      <div className="remember-row"><Checkbox id="remember" defaultChecked /><Label htmlFor="remember">Rester connecté sur cet appareil</Label></div>
      <Button type="submit" className="w-full" size="lg" disabled={submitting}>{submitting ? "Connexion…" : "Se connecter"}<ArrowRight /></Button>
      <p className="auth-switch">Nouveau sur Noya ? <Link href="/auth/register">Créer un compte</Link></p>
    </form>
  );
}

function homeForRoles(roles: string[]) {
  if (roles.includes("SUPER_ADMIN")) return "/super-admin";
  if (roles.includes("ADMIN")) return "/admin";
  if (roles.includes("SUPPORT")) return "/support";
  if (roles.includes("FINANCE")) return "/finance";
  if (roles.includes("OBSERVER")) return "/observe/parties/demo-party";
  return "/parties";
}
