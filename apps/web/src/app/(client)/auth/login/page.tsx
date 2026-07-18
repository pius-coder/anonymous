import { AuthFrame } from "@/components/auth/AuthFrame";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return <AuthFrame title="Bon retour parmi nous" description="Connectez-vous pour retrouver vos tickets, rooms et résultats."><LoginForm /></AuthFrame>;
}
