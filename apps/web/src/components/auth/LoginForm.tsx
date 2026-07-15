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
  const { login, loading, error } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const response = await login(email, password);
    if (response.success) router.push("/");
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error ? <Alert variant="destructive"><AlertCircle /><AlertDescription>{error}</AlertDescription></Alert> : null}
      <div className="auth-field"><Label htmlFor="email">Adresse email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@exemple.com" required /></div>
      <div className="auth-field"><div className="auth-label-row"><Label htmlFor="password">Mot de passe</Label><Link href="/auth/reset">Mot de passe oublié ?</Link></div><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
      <div className="remember-row"><Checkbox id="remember" defaultChecked /><Label htmlFor="remember">Rester connecté sur cet appareil</Label></div>
      <Button className="w-full" size="lg" disabled={loading}>{loading ? "Connexion…" : "Se connecter"}<ArrowRight /></Button>
      <p className="auth-switch">Nouveau sur Noya ? <Link href="/auth/register">Créer un compte</Link></p>
    </form>
  );
}
