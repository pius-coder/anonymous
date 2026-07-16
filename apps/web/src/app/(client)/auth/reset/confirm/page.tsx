import { Suspense } from "react";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { ConfirmPasswordResetForm } from "@/components/auth/ConfirmPasswordResetForm";

export default function ConfirmResetPage() {
  return (
    <AuthFrame
      title="Nouveau mot de passe"
      description="Choisissez un mot de passe fort. Les sessions actives seront invalidées."
    >
      <Suspense fallback={<p role="status">Chargement du formulaire…</p>}>
        <ConfirmPasswordResetForm />
      </Suspense>
    </AuthFrame>
  );
}
