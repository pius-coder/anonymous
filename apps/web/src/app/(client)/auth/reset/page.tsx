import { AuthFrame } from "@/components/auth/AuthFrame";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPage() {
  return <AuthFrame title="Réinitialiser l’accès" description="Nous enverrons un lien temporaire sans révéler si le compte existe."><ResetPasswordForm /></AuthFrame>;
}
