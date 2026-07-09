"use client";

import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-head text-3xl font-black uppercase">Connexion</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link href="/auth/register" className="font-bold text-primary underline underline-offset-2">
            Crée-en un
          </Link>
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
