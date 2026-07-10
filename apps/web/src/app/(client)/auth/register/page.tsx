"use client";

import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-head text-3xl font-black uppercase">Créer un compte</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Déjà inscrit ?{" "}
          <Link href="/auth/login" className="font-bold text-primary underline underline-offset-2">
            Connecte-toi
          </Link>
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
