"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { Input } from "@/components/retroui/input";
import { Label } from "@/components/retroui/label";
import { Textarea } from "@/components/retroui/textarea";
import { Switch } from "@/components/retroui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/retroui/avatar";
import { Skeleton } from "@/components/retroui/skeleton";
import { apiGet, apiPatch, type ApiError } from "@/lib/api";
import { useSession } from "@/lib/useSession";

type ProfileStats = {
  sessionsPlayed: number;
  sessionsWon: number;
  winRate: number;
  avgFinalRank: number | null;
  creditsWonXaf: number;
  computedAt: string;
};

type PlayerProfile = {
  id: string;
  userId: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  preferences: Record<string, unknown>;
  isPublic: boolean;
  level: number;
  xp: number;
  stats: ProfileStats;
  createdAt: string;
  updatedAt: string;
};

type ProfileResponse = { profile: PlayerProfile };

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium uppercase text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const { user, loading } = useSession();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const [form, setForm] = useState({ username: "", bio: "", avatarUrl: "", isPublic: false });

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    apiGet<ProfileResponse>("/players/me")
      .then((res) => {
        if (res.ok) setProfile(res.data.profile);
        else setError(res.error);
      })
      .finally(() => setLoadingData(false));
  }, [user, loading]);

  function startEdit() {
    if (!profile) return;
    setForm({
      username: profile.username,
      bio: profile.bio ?? "",
      avatarUrl: profile.avatarUrl ?? "",
      isPublic: profile.isPublic,
    });
    setSaveError(null);
    setSaveOk(false);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    const res = await apiPatch<ProfileResponse>("/players/me", {
      username: form.username,
      bio: form.bio || null,
      avatarUrl: form.avatarUrl || null,
      isPublic: form.isPublic,
    });
    setSaving(false);
    if (res.ok) {
      setProfile(res.data.profile);
      setEditing(false);
      setSaveOk(true);
    } else if (res.error.code === "400_INVALID_NICKNAME") {
      setSaveError("Le pseudo doit faire 3 à 24 caractères (lettres, chiffres, _).");
    } else if (res.error.code === "409_NICKNAME_TAKEN") {
      setSaveError("Ce pseudo est déjà pris.");
    } else {
      setSaveError(res.error.message || "Échec de la mise à jour.");
    }
  }

  if (loading || loadingData) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Skeleton className="mb-6 h-10 w-48" />
        <div className="space-y-6">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <Skeleton className="size-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-5 w-24" />
              </div>
            </CardContent>
          </Card>
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p>Connecte-toi pour voir ton profil.</p>
      </div>
    );
  }

  const initials = (profile?.username ?? user.name ?? user.email).slice(0, 2).toUpperCase();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-head text-4xl font-black uppercase">Profil</h1>
        {!editing && (
          <Button size="sm" variant="outline" onClick={startEdit}>
            Modifier
          </Button>
        )}
      </div>

      {error && !profile && (
        <Card>
          <CardContent className="pt-6 text-[--arena-danger]">
            Impossible de charger le profil. Réessaie plus tard.
          </CardContent>
        </Card>
      )}

      {profile && (
        <div className="space-y-6">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <Avatar className="size-16 border-2 border-border">
                {profile.avatarUrl ? (
                  <AvatarImage src={profile.avatarUrl} alt={profile.username} />
                ) : null}
                <AvatarFallback className="bg-secondary font-head text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-head text-xl font-black uppercase">@{profile.username}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                {user.name && <p className="truncate text-sm">{user.name}</p>}
                <Badge variant="outline" className="mt-1">
                  Niveau {profile.level} · {profile.xp} XP
                </Badge>
              </div>
            </CardContent>
          </Card>

          {!editing ? (
            <>
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Bio</h3>
                <Card>
                  <CardContent className="whitespace-pre-wrap pt-6 text-sm">
                    {profile.bio || <span className="text-muted-foreground">Aucune bio.</span>}
                  </CardContent>
                </Card>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Visibilité</h3>
                <Card>
                  <CardContent className="pt-6 text-sm">
                    {profile.isPublic
                      ? "Profil public — visible par les autres joueurs."
                      : "Profil privé — visible par toi uniquement."}
                  </CardContent>
                </Card>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Statistiques</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="Sessions" value={profile.stats.sessionsPlayed} />
                  <StatCard label="Victoires" value={profile.stats.sessionsWon} />
                  <StatCard label="Win rate" value={`${Math.round(profile.stats.winRate * 100)}%`} />
                  <StatCard
                    label="Crédits gagnés"
                    value={`${new Intl.NumberFormat("fr-FR").format(profile.stats.creditsWonXaf)} XAF`}
                  />
                </div>
              </section>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Modifier le profil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Pseudo</Label>
                  <Input
                    id="username"
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    maxLength={24}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatarUrl">URL de l&apos;avatar</Label>
                  <Input
                    id="avatarUrl"
                    type="url"
                    placeholder="https://…"
                    value={form.avatarUrl}
                    onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    rows={4}
                    maxLength={280}
                    value={form.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">{form.bio.length}/280</p>
                </div>

                <div className="flex items-center justify-between border-2 border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Profil public</p>
                    <p className="text-xs text-muted-foreground">Visible par les autres joueurs.</p>
                  </div>
                  <Switch
                    checked={form.isPublic}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isPublic: v === true }))}
                  />
                </div>

                {saveError && <p className="font-bold text-[--arena-danger]">{saveError}</p>}
                {saveOk && <p className="font-bold text-[--arena-green]">Profil mis à jour.</p>}

                <div className="flex gap-3">
                  <Button onClick={save} disabled={saving}>
                    {saving ? "Enregistrement…" : "Enregistrer"}
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="pt-2">
            <Link href="/me/sessions">
              <Button variant="outline">Voir mes sessions</Button>
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
