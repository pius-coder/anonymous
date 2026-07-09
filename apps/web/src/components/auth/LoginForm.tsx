"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/retroui/button";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/retroui/field";
import { Input } from "@/components/retroui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/retroui/alert";
import { useSession } from "@/lib/useSession";
import { translateError, formatRateLimit } from "@/lib/errors.fr";
import type { ApiError } from "@/lib/api";

export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const { login } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const err = await login({ email, password });
    setPending(false);
    if (err) {
      setError(err);
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    if (onSuccess) onSuccess();
    if (next) router.push(next);
    else router.push("/me/sessions");
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      {error && (
        <Alert variant="destructive" aria-live="assertive">
          <AlertTitle>Connexion impossible</AlertTitle>
          <AlertDescription>
            {translateError(error.code, error.status)}{" "}
            {error.code === "LOGIN_RATE_LIMITED" && formatRateLimit()}
          </AlertDescription>
        </Alert>
      )}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="toi@exemple.fr"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="login-password">Mot de passe</FieldLabel>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <FieldDescription className="text-right">
            <Link href="/auth/reset-password" className="underline underline-offset-2">
              Mot de passe oublié ?
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
