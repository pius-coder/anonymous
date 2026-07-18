"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AlertCircle, ArrowLeft, MailCheck } from "lucide-react";
import { AuthService } from "@/services/auth/AuthService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Request form: always shows the same generic success message (no account enumeration).
 * States: idle → loading → success | error (retryable).
 */
export function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await AuthService.requestPasswordReset(email);
      if (result.success) {
        setSent(true);
      } else {
        setError(result.error.message);
      }
    } catch {
      setError("Le service est momentanément indisponible. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-form" role="status" aria-live="polite">
        <Alert status="success">
          <MailCheck aria-hidden />
          <AlertDescription>
            Si ce compte existe, un lien sécurisé vient d’être envoyé. Vérifiez votre boîte mail.
          </AlertDescription>
        </Alert>
        <Button render={<Link href="/auth/login" />} variant="outline">
          <ArrowLeft aria-hidden /> Retour à la connexion
        </Button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit} aria-busy={pending}>
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertCircle aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="auth-field">
        <Label htmlFor="reset-email">Adresse email</Label>
        <Input
          id="reset-email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={pending}
          aria-required="true"
        />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={pending} aria-disabled={pending}>
        {pending ? "Envoi…" : "Recevoir le lien"}
      </Button>
      <p className="auth-switch">
        <Link href="/auth/login">Retour à la connexion</Link>
      </p>
    </form>
  );
}
