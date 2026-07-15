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

export function RegisterForm() {
  const router = useRouter();
  const { register, loading, error } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const response = await register(email, password, name || undefined);
    if (response.success) router.push("/");
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error ? <Alert variant="destructive"><AlertCircle /><AlertDescription>{error}</AlertDescription></Alert> : null}
      <div className="auth-field"><Label htmlFor="name">Nom affiché</Label><Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Votre pseudo" /></div>
      <div className="auth-field"><Label htmlFor="reg-email">Adresse email</Label><Input id="reg-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
      <div className="auth-field"><Label htmlFor="reg-password">Mot de passe</Label><Input id="reg-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /><small>8 caractères minimum.</small></div>
      <div className="remember-row"><Checkbox id="terms" required /><Label htmlFor="terms">J’accepte les conditions et la politique de confidentialité.</Label></div>
      <Button className="w-full" size="lg" disabled={loading}>{loading ? "Création…" : "Créer mon compte"}<ArrowRight /></Button>
      <p className="auth-switch">Déjà inscrit ? <Link href="/auth/login">Se connecter</Link></p>
    </form>
  );
}
