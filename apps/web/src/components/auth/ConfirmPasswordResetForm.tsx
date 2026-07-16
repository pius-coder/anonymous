"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { AuthService } from "@/services/auth/AuthService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormState = "idle" | "loading" | "success" | "invalid" | "error";

/**
 * Confirm form: reads opaque token from ?token=, applies new password, shows
 * invalid/expired, loading, success and retry states with accessible labels.
 */
export function ConfirmPasswordResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<FormState>(token ? "idle" : "invalid");
  const [error, setError] = useState<string | null>(
    token ? null : "Lien de réinitialisation invalide ou expiré",
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      setState("invalid");
      setError("Lien de réinitialisation invalide ou expiré");
      return;
    }
    if (password.length < 8) {
      setState("error");
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (password !== confirm) {
      setState("error");
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setState("loading");
    setError(null);
    try {
      const result = await AuthService.resetPassword(token, password);
      if (result.success) {
        setState("success");
        return;
      }
      const message = result.error.message;
      const isInvalidToken =
        /invalide|expiré|expired|invalid/i.test(message) ||
        result.error.code.includes("InvalidArgument") ||
        result.error.code.includes("3");
      setState(isInvalidToken ? "invalid" : "error");
      setError(message);
    } catch {
      setState("error");
      setError("Le service est momentanément indisponible. Réessayez.");
    }
  }

  if (state === "success") {
    return (
      <div className="auth-form" role="status" aria-live="polite">
        <Alert status="success">
          <CheckCircle2 aria-hidden />
          <AlertDescription>
            Mot de passe mis à jour. Toutes les sessions précédentes ont été invalidées.
          </AlertDescription>
        </Alert>
        <Button
          type="button"
          className="w-full"
          size="lg"
          onClick={() => router.push("/auth/login")}
        >
          Se connecter
        </Button>
      </div>
    );
  }

  if (state === "invalid" && !token) {
    return (
      <div className="auth-form" role="alert">
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>
            Lien de réinitialisation invalide ou expiré. Demandez un nouveau lien.
          </AlertDescription>
        </Alert>
        <Button render={<Link href="/auth/reset" />} variant="outline">
          <ArrowLeft aria-hidden /> Demander un nouveau lien
        </Button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit} aria-busy={state === "loading"}>
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertCircle aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {state === "invalid" ? (
        <p className="auth-switch">
          <Link href="/auth/reset">Demander un nouveau lien</Link>
        </p>
      ) : null}
      <div className="auth-field">
        <Label htmlFor="new-password">Nouveau mot de passe</Label>
        <Input
          id="new-password"
          type="password"
          name="newPassword"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
          disabled={state === "loading"}
          aria-required="true"
          aria-describedby="new-password-hint"
        />
        <small id="new-password-hint">8 caractères minimum.</small>
      </div>
      <div className="auth-field">
        <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
        <Input
          id="confirm-password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          minLength={8}
          required
          disabled={state === "loading"}
          aria-required="true"
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={state === "loading"}
        aria-disabled={state === "loading"}
      >
        {state === "loading" ? "Mise à jour…" : "Enregistrer le mot de passe"}
      </Button>
      <p className="auth-switch">
        <Link href="/auth/login">Retour à la connexion</Link>
      </p>
    </form>
  );
}
