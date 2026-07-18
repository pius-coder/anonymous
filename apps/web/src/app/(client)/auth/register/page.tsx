import { AuthFrame } from "@/components/auth/AuthFrame";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return <AuthFrame title="Créer votre profil" description="Quelques informations suffisent pour entrer dans l’univers Noya."><RegisterForm /></AuthFrame>;
}
