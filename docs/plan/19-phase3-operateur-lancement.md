# PHASE 3 — L'OPÉRATEUR & LE LANCEMENT
## Admin complet · Program Builder · Contrôle live · PixiJS · Polish · Recette finale

> Fichier cible : `docs/plan/19-phase3-operateur-lancement.md`
> Prérequis : Phases 1 & 2 vertes. Cette phase transforme un jeu jouable en **plateforme exploitable et lançable**.

---

# PARTIE A — VUE D'ENSEMBLE & SPRINTS

| Sprint | Contenu | Durée |
|---|---|---|
| **3A** | Layout admin (Sidebar RBAC) + Dashboard + liste sessions | 3 j |
| **3B** | **Program Builder** (création session multi-jeux + simulation funnel) | 4 j |
| **3C** | Contrôle live admin (room monitor, pause/resume, finalize) + audit + support | 4 j |
| **3D** | PixiJS : famille Survie avancée (rayon balayeur ou sol qui s'effondre) | 4 j |
| **3E** | Polish (perf, a11y, i18n wording, empty/error states) + **recette finale** | 4 j |

## Gate documentaire Phase 3

1. Context7 Next 16 : layouts imbriqués (`/admin/layout.tsx`), route groups, middleware de protection.
2. Context7 : composant `Sidebar` shadcn (structure `SidebarProvider/SidebarMenu`) — adapter au style RetroUI.
3. Context7 `pixi.js` v8 : `await app.init()`, `app.canvas`, `app.destroy()`, ticker — et le double-mount StrictMode.
4. Context7 : `@dnd-kit/core` + `@dnd-kit/sortable` (drag & drop du Program Builder) — vérifier avant install.
5. Relire routes admin existantes (`apps/api/src/routes/admin/`) : **l'agent liste les contrats réels avant de coder la moindre page** (`ls` + lecture des fichiers), il n'invente aucun endpoint.

---

# PARTIE B — SPRINT 3A : SOCLE ADMIN

## B.1 Layout & protection

- `/admin/layout.tsx` : vérifie la session **côté serveur** (`GET /v1/me` via cookie) ; rôle non admin → 404 (pas 403, on ne confirme pas l'existence de la zone).
- `Sidebar` RetroUI-isée, entrées filtrées par rôle :

| Entrée | ADMIN | SUPER_ADMIN | FINANCE | SUPPORT |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Sessions (CRUD) | ✅ | ✅ | 👁 lecture | 👁 |
| Live control | ✅ | ✅ | ❌ | 👁 |
| Paiements / réconciliation | 👁 | ✅ | ✅ | 👁 |
| Wallets / ajustements | ❌ | ✅ | ✅ | 👁 |
| Utilisateurs (support) | 👁 | ✅ | 👁 | ✅ |
| Mini-jeux | ✅ | ✅ | ❌ | ❌ |
| Audit logs | ✅ | ✅ | ✅ | 👁 |

- Le filtrage UI est du confort ; **la vérité RBAC reste les middlewares API existants** — test négatif obligatoire par rôle.

## B.2 Dashboard

- Rangée KPI (`Card` + `AnimatedNumber`) : sessions publiées / live now / inscriptions 7j / paiements SUCCESS 7j / volume XAF 7j / incidents ouverts.
- `Data Table` sessions récentes : statut (`Badge`), remplissage (`Progress`), actions rapides.
- Bandeau `Alert` si signaux critiques (wallets `isLedgerAligned=false`, webhooks en échec) — branché sur les routes admin existantes uniquement.

---

# PARTIE C — SPRINT 3B : LE PROGRAM BUILDER (pièce maîtresse)

## C.1 Le wizard de création (`Sheet` large, 4 étapes)

```
Étape 1 · Général      → nom, description, date, visibilité (PUBLIC/UNLISTED/PRIVATE), min/max joueurs
Étape 2 · Économie     → entryFeeXaf, prizePoolBps, winnersCount, winnerSplitBps[]
                          + simulation financière LIVE (brute → frais → net → récompenses → commission)
Étape 3 · PROGRAMME    → le builder ci-dessous
Étape 4 · Révision     → récap complet + funnel + bouton Publier (Alert Dialog + reason)
```

Invariants revalidés à chaque étape (miroir client des règles serveur Feature 04) : `sum(winnerSplitBps)=10000`, `min≥2`, `entryFee≥100 XAF`, programme cohérent.

## C.2 Code — `ProgramBuilder.tsx` (avec simulation funnel)

```tsx
// apps/web/src/components/admin/ProgramBuilder.tsx
"use client";
import { useMemo, useState } from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { simulateProgram, type EliminationPolicy } from "@session-jeu/game-engine";
import { Button } from "@/components/retroui/Button";
import { Badge } from "@/components/retroui/Badge";

export type RoundDraft = {
  localId: string;
  miniGame: { id: string; key: string; name: string; family: string; playerMode: string; configSchema: unknown; defaultConfig: Record<string, unknown> };
  configJson: Record<string, unknown>;
  durationMs: number;
  policy: EliminationPolicy;
};

const POLICY_LABELS: Record<EliminationPolicy["type"], string> = {
  KEEP_TOP_N: "Les N meilleurs passent",
  ELIMINATE_BOTTOM_N: "Les N derniers sortent",
  ELIMINATE_BOTTOM_PERCENT: "% du bas éliminé",
  DUEL_WINNER_ADVANCES: "Vainqueur de duel avance",
  SURVIVAL_UNTIL_QUOTA: "Survie jusqu'au quota",
  NO_ELIMINATION: "Aucune élimination (points)",
};

const FAMILY_POLICIES: Record<string, EliminationPolicy["type"][]> = {
  SOLO:     ["KEEP_TOP_N", "ELIMINATE_BOTTOM_N", "ELIMINATE_BOTTOM_PERCENT", "NO_ELIMINATION"],
  DUEL:     ["DUEL_WINNER_ADVANCES"],
  SURVIVAL: ["SURVIVAL_UNTIL_QUOTA", "ELIMINATE_BOTTOM_PERCENT", "KEEP_TOP_N"],
};

function policyLabel(p: EliminationPolicy) {
  switch (p.type) {
    case "KEEP_TOP_N": return `Top ${p.n} passent`;
    case "ELIMINATE_BOTTOM_N": return `${p.n} derniers éliminés`;
    case "ELIMINATE_BOTTOM_PERCENT": return `${p.bps / 100}% éliminés`;
    case "SURVIVAL_UNTIL_QUOTA": return `Survie → ${p.quota} restants`;
    default: return POLICY_LABELS[p.type];
  }
}

function SortableRoundCard({ round, index, onEdit, onRemove }: {
  round: RoundDraft; index: number; onEdit: () => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: round.localId });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
         className="flex items-center gap-3 border-2 border-border bg-card p-3 shadow-sm">
      <button {...attributes} {...listeners} className="cursor-grab font-head text-muted-foreground" aria-label="Réordonner">⠿</button>
      <span className="font-head text-2xl text-[--arena-pink]">#{index + 1}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-head">{round.miniGame.name}</p>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge variant="outline">{round.miniGame.family}</Badge>
          <Badge>{policyLabel(round.policy)}</Badge>
          <Badge variant="outline">{Math.round(round.durationMs / 1000)}s</Badge>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onEdit}>Config</Button>
      <Button size="sm" variant="outline" onClick={onRemove} aria-label="Supprimer">✕</Button>
    </div>
  );
}

export function ProgramBuilder({ rounds, setRounds, minPlayers, maxPlayers, winnersCount, onAddRound, onEditRound }: {
  rounds: RoundDraft[];
  setRounds: (r: RoundDraft[]) => void;
  minPlayers: number; maxPlayers: number; winnersCount: number;
  onAddRound: () => void;                 // ouvre le Dialog "catalogue de jeux"
  onEditRound: (localId: string) => void; // ouvre le Dialog config (form généré du configSchema)
}) {
  /* ===== Simulation funnel : LA MÊME fonction que le serveur (package partagé) ===== */
  const policies = rounds.map(r => r.policy);
  const funnelMax = useMemo(() => simulateProgram(maxPlayers, policies), [maxPlayers, policies]);
  const funnelMin = useMemo(() => simulateProgram(minPlayers, policies), [minPlayers, policies]);
  const finalMax = funnelMax.at(-1) ?? maxPlayers;
  const finalMin = funnelMin.at(-1) ?? minPlayers;
  const coherent = finalMax >= winnersCount && finalMin >= Math.min(winnersCount, minPlayers) && rounds.length > 0;

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = rounds.findIndex(r => r.localId === e.active.id);
    const to = rounds.findIndex(r => r.localId === e.over!.id);
    setRounds(arrayMove(rounds, from, to));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {/* Colonne gauche : programme ordonné */}
      <div className="space-y-3">
        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={rounds.map(r => r.localId)} strategy={verticalListSortingStrategy}>
            {rounds.map((r, i) => (
              <SortableRoundCard key={r.localId} round={r} index={i}
                onEdit={() => onEditRound(r.localId)}
                onRemove={() => setRounds(rounds.filter(x => x.localId !== r.localId))} />
            ))}
          </SortableContext>
        </DndContext>
        <Button onClick={onAddRound} className="w-full">+ Ajouter un round</Button>
      </div>

      {/* Colonne droite : funnel permanent (sticky) */}
      <aside className="lg:sticky lg:top-4 h-fit space-y-3 border-2 border-border bg-card p-4 shadow-md">
        <h3 className="font-head text-lg">Funnel d'effectifs</h3>
        {[{ label: `Session pleine (${maxPlayers})`, steps: funnelMax },
          { label: `Minimum (${minPlayers})`, steps: funnelMin }].map(({ label, steps }) => (
          <div key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-head text-lg tracking-tight">
              {steps.map((n, i) => (
                <span key={i}>
                  <span className={i === steps.length - 1 ? (n >= winnersCount ? "text-[--arena-green]" : "text-[--arena-danger]") : ""}>{n}</span>
                  {i < steps.length - 1 && <span className="text-muted-foreground"> → </span>}
                </span>
              ))}
            </p>
          </div>
        ))}
        <div className="border-t-2 border-border pt-3">
          <p className="text-xs text-muted-foreground">Gagnants configurés : {winnersCount}</p>
          {coherent
            ? <Badge className="bg-[--arena-green] text-black">✔ Programme cohérent</Badge>
            : <Badge className="bg-[--arena-danger]">✕ Incohérent — publication bloquée</Badge>}
          {!coherent && rounds.length > 0 && (
            <p className="mt-2 text-xs text-[--arena-danger]">
              Le programme doit laisser au moins {winnersCount} joueur(s) à la fin. Ajuste les policies.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
```

**Règles pour l'agent** :
- `simulateProgram` est **importée du package game-engine** (Phase 1) — jamais réimplémentée côté web (une seule vérité).
- Le `Dialog` "ajouter un round" : `Tabs` par famille → jeux depuis `GET /v1/admin/minigames` (enabled only) → form de config **généré depuis `configSchema`** (number→`Input type=number` avec min/max du schema, pas de champ inventé) → `Select` policy filtré par `FAMILY_POLICIES`.
- La validation finale reste serveur (route publish) ; le client ne fait qu'empêcher les évidences.
- Duel avec effectif impair : afficher l'avertissement "bye automatique pour le mieux classé".

---

# PARTIE D — SPRINT 3C : CONTRÔLE LIVE, AUDIT, SUPPORT

## D.1 Live control `/admin/sessions/[id]/live`

- **Monitor** : polling `GET /v1/live/:sessionId/state` (5s) — pas de room admin en V1 si la route admin WS n'existe pas ; sinon réservation admin (décision au gate selon routes réelles). Affiche : phase, round courant + deadline (`CountdownRing` réutilisé), `Data Table` joueurs (statut connexion, soumis, reconnectUntil), funnel réel vs prévu.
- **Actions** : Pause / Reprendre / Finaliser → chacune : `Alert Dialog` + `Textarea` reason **obligatoire** (bouton désactivé si vide) → routes admin existantes. Toast résultat + rafraîchissement.
- **Incidents** : bouton "Créer un incident" (route existante), liste des `AntiCheatEvent` du round (lecture).

## D.2 Audit `/admin/audit`

`Data Table` + filtres : `Date Picker` période, `Combobox` action, `Input` entityId/requestId. Ligne → `Sheet` détail : acteur, before/after en `<pre>` JSON diffé (2 colonnes rouge/vert), IP hashée, requestId copiable. **Aucune suppression possible** (pas de bouton, et test API le confirme).

## D.3 Support `/admin/users`

Recherche (`Command` ⌘K) → fiche `Tabs` : Profil / Inscriptions / Paiements / Wallet-ledger (lecture). **Masquage** : jamais `providerTransId` complet (tronqué `fap_…3f9`), jamais de secrets. Actions selon rôle : réconcilier paiement (FINANCE), ajustement wallet (FINANCE/SUPER_ADMIN, reason + confirmation montant retapé), créer SupportCase.

**Tests 3C** : RBAC négatif par rôle sur chaque page, reason vide bloqué, audit écrit pour chaque action (vérifié via l'API audit), secrets absents du DOM (test Playwright `page.content()` ne contient pas le transId complet).

---

# PARTIE E — SPRINT 3D : PIXIJS POUR LA SURVIE AVANCÉE

Objectif : 1 jeu à mouvement continu (**Le rayon balayeur**, catalogue §5.5) pour prouver la chaîne canvas. La logique reste serveur : le serveur diffuse la trajectoire déterministe (fonction + t0 + vitesse), le client la **rejoue localement pour l'affichage**, les positions joueurs viennent du state sync, les collisions sont tranchées serveur à chaque tick.

## E.1 Wrapper `GameCanvas` (le point fragile — StrictMode)

```tsx
// apps/web/src/components/games/pixi/GameCanvas.tsx
"use client";
import { useEffect, useRef } from "react";
import type { Application } from "pixi.js";

export function GameCanvas({ onReady }: { onReady: (app: Application) => (() => void) | void }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let app: Application | null = null;
    let cleanup: (() => void) | void;
    let cancelled = false;

    (async () => {
      const { Application } = await import("pixi.js"); // code-split : jamais dans le bundle commun
      const a = new Application();
      await a.init({ resizeTo: hostRef.current!, background: "#0e0f13", antialias: true });
      if (cancelled) { a.destroy(true); return; }       // StrictMode : init résolue après unmount
      app = a;
      hostRef.current!.appendChild(a.canvas);
      cleanup = onReady(a);
    })();

    return () => {
      cancelled = true;
      cleanup?.();
      app?.destroy(true, { children: true });           // détruit ticker + GPU proprement
    };
  }, [onReady]);

  return <div ref={hostRef} className="h-full w-full touch-none" />;
}
```

Chargé uniquement dans la surface du jeu concerné via `next/dynamic(() => import(...), { ssr: false })`. **Test bundle** : `pnpm build` + vérifier que `pixi` n'apparaît pas dans le chunk des pages publiques.

## E.2 Règles du renderer "rayon balayeur"

- Le serveur envoie `sweep.config { fn: "linear"|"rotate", t0EpochMs, speed, width, seed }` → le client calcule la position du rayon à `now` (même formule que le serveur, déterministe) → aucune désync visuelle même à 200ms de latence.
- Position du joueur : glisser/toucher → envoi throttlé `move { x, y }` (10/s max, aligné sur les rate caps anti-cheat) → le state sync renvoie les positions **officielles** de tous ; le sprite local est interpolé vers la position serveur (lerp), jamais téléporté par le clic.
- Élimination : uniquement sur message serveur → flash rouge + son + le sprite tombe (tween alpha).
- Fallback perf : si `devicePixelRatio` élevé + fps < 40 mesurés → réduire résolution du renderer (option `resolution: 1`).

---

# PARTIE F — SPRINT 3E : POLISH & RECETTE FINALE

## F.1 Polish

- **États** : chaque page a ses 4 états (loading `Skeleton`, vide `Empty`, erreur `Alert` + retry, succès). Audit systématique avec une checklist par route.
- **Wording** : re-scan global interdits (`pari|mise|jackpot|gain garanti|prize pool`) — inclut les pages admin (démos possibles) ; correction des fautes résiduelles.
- **Perf** : Lighthouse mobile ≥ 85 (public), ≥ 75 (live) ; images optimisées ; audio sprite lazy ; Pixi code-splitté.
- **A11y** : focus visible partout (le ring rose), `aria-live` sur phases/toasts, contraste vérifié (le rose #ED1B76 sur fond sombre passe AA en gros texte — vérifier les petits textes).
- **Sécurité UI** : aucun token en localStorage (seul `reconnectionToken` en sessionStorage, éphémère), aucune donnée admin dans le HTML public.

## F.2 Recette finale — les 5 parcours (reprend `docs/recette/`, désormais automatisables)

| # | Parcours | Automatisation |
|---|---|---|
| 1 | Découverte → compte → inscription | Playwright complet |
| 2 | Paiement (webhook Fapshi simulé) → lobby → check-in | Playwright + mock webhook signé |
| 3 | **Live 2 navigateurs** : 2 contexts Playwright, session 2 rounds, 1 élimination, 1 reconnexion (context.setOffline) | Playwright multi-context |
| 4 | Résultats → distribution → wallet crédité → stats | Playwright + assertions API ledger |
| 5 | Admin : créer programme 3 rounds (funnel vert) → publier → pause/resume live → audit trace | Playwright rôle admin |

- - tests de concurrence reconduits (dernière place, double débit, double distribution) + test roi anti-fuite + chaos test (kill game-server en plein round → worker clôture → session finalisable).

## F.3 Checklist go/no-go (mise à jour du rapport de recette)

Bloquants live public (inchangés) : CGU/confidentialité, avis légal ou lancement limité sans cash-out (déjà bloqué), Fapshi live + IP whitelist, backups PG, monitoring/alertes, plan incident, rollback. **Nouveau** : test de charge léger (50 joueurs simulés sur 1 session — script `colyseus.js` headless), vérification coût data mobile d'une session complète (< 5 MB hors première visite).

## F.4 Definition of Done — PROJET

- ✅ Les 5 parcours Playwright passent en CI.
- ✅ Une session réelle de bout en bout avec 6+ vrais téléphones en conditions réseau camerounaises (test terrain documenté).
- ✅ Zéro endpoint admin sans RBAC testé négativement.
- ✅ Zéro incohérence ledger/wallet ; zéro cash-out possible.
- ✅ `CREDITS.md` assets complet ; licences archivées.
- ✅ Rapport final : versions, commits, library IDs Context7, anomalies restantes, go/no-go signé.

---

## Récapitulatif des 3 phases

```
PHASE 1  Fondations      → identité Squid Game, sons/vibrations, boucle de rounds serveur,
                           runtimes anti-triche, spectateur (StateView/messages ciblés)
PHASE 2  Joueur          → auth drawer, paiement, lobby, client Colyseus, 3 mini-jeux UI,
                           élimination/spectateur/résultats
PHASE 3  Opérateur       → admin RBAC, Program Builder + funnel, live control, audit/support,
                           PixiJS survie, polish, recette 5 parcours, go/no-go
```
