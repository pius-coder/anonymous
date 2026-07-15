"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { AuthService } from "@/services/auth/AuthService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setError(null);
    const result = await AuthService.requestPasswordReset(email);
    setPending(false);
    if (result.success) setSent(true); else setError(result.error.message);
  }
  if (sent) return <div className="auth-form"><Alert status="success"><MailCheck /><AlertDescription>Si ce compte existe, un lien sécurisé vient d’être envoyé.</AlertDescription></Alert><Button render={<Link href="/auth/login" />} variant="outline"><ArrowLeft /> Retour à la connexion</Button></div>;
  return <form className="auth-form" onSubmit={submit}>{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<div className="auth-field"><Label htmlFor="reset-email">Adresse email</Label><Input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><Button disabled={pending}>{pending ? "Envoi…" : "Recevoir le lien"}</Button><p className="auth-switch"><Link href="/auth/login">Retour à la connexion</Link></p></form>;
}
