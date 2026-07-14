"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "../../lib/useSession";

export function RegisterForm() {
  const router = useRouter();
  const { register, loading, error } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await register(email, password, name || undefined);
    if (res.success) {
      router.push("/");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="text-xl font-bold">Inscription</h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div>
        <label htmlFor="name" className="block text-sm font-medium">Nom (optionnel)</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded border p-2"
        />
      </div>
      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium">Email</label>
        <input
          id="reg-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full rounded border p-2"
        />
      </div>
      <div>
        <label htmlFor="reg-password" className="block text-sm font-medium">Mot de passe</label>
        <input
          id="reg-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="mt-1 block w-full rounded border p-2"
        />
      </div>
      <button type="submit" disabled={loading} className="w-full rounded bg-green-600 p-2 text-white font-medium disabled:opacity-50">
        {loading ? "Inscription..." : "Créer un compte"}
      </button>
    </form>
  );
}
