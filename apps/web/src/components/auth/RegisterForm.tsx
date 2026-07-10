"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/retroui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/retroui/field";
import { Input } from "@/components/retroui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/retroui/alert";
import { useSession } from "@/lib/useSession";
import { translateError } from "@/lib/errors.fr";
import type { ApiError } from "@/lib/api";

type FieldKey = "email" | "password" | "name" | "username" | "phone";

export function RegisterForm({ onSuccess }: { onSuccess?: () => void }) {
  const { register } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    username: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [general, setGeneral] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);

  function set(key: FieldKey, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setGeneral(null);
    setPending(true);
    const err = await register(form);
    setPending(false);
    if (err) {
      if (err.details && typeof err.details === "object") {
        const fieldErrors: Partial<Record<FieldKey, string>> = {};
        for (const [k, v] of Object.entries(err.details)) {
          if (Array.isArray(v) && v[0]) fieldErrors[k as FieldKey] = v[0] as string;
        }
        if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
      }
      setGeneral(err);
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    if (onSuccess) onSuccess();
    if (next) router.push(next);
    else router.push("/me/sessions");
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      {general && !Object.keys(errors).length && (
        <Alert variant="destructive" aria-live="assertive">
          <AlertTitle>Inscription impossible</AlertTitle>
          <AlertDescription>{translateError(general.code, general.status)}</AlertDescription>
        </Alert>
      )}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="reg-email">Email</FieldLabel>
          <Input
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="toi@exemple.fr"
          />
          {errors.email && <FieldError>{errors.email}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="reg-username">Pseudo</FieldLabel>
          <Input
            id="reg-username"
            autoComplete="username"
            required
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            placeholder="Ton pseudo de jeu"
          />
          {errors.username && <FieldError>{errors.username}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="reg-name">Nom affiché (optionnel)</FieldLabel>
          <Input
            id="reg-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ton vrai prénom"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="reg-phone">Téléphone (optionnel)</FieldLabel>
          <Input
            id="reg-phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+237 6XX XXX XXX"
          />
          {errors.phone && <FieldError>{errors.phone}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="reg-password">Mot de passe</FieldLabel>
          <Input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="••••••••"
          />
          {errors.password && <FieldError>{errors.password}</FieldError>}
        </Field>
      </FieldGroup>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
