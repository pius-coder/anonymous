import { useSession } from "@/lib/useSession";

export function useAuth() {
  return useSession();
}
