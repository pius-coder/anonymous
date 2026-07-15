import Link from "next/link";
import { Eye, Gamepad2, Gauge, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { LifecycleBanner } from "@/components/ui/LifecycleBanner";

export default function HomePage() {
  return (
    <AppShell
      audience="Admin"
      eyebrow="Sprint 10"
      title="Round orchestration"
      subtitle="Surfaces v0.1 pour piloter une manche autoritaire, verifier le parcours joueur et observer sans fuite d'etat prive."
      actions={<ConnectionStatus state="stable" />}
    >
      <div className="home-dashboard">
        <LifecycleBanner
          status="ROUND_SETUP -> ROUND_VERIFICATION"
          detail="Demarrage manuel admin, pause/reprise explicites, fermeture technique sans publication de scores."
        />

        <section className="surface-grid" aria-label="Surfaces Sprint 10">
          <Link className="surface-tile" href="/admin/parties/demo-party/control">
            <Gauge aria-hidden="true" size={22} />
            <span>
              <strong>Command center</strong>
              <small>Configurer, lancer briefing, demarrer, pause, reprise, fermer.</small>
            </span>
          </Link>
          <Link className="surface-tile" href="/parties/demo-round/round">
            <Gamepad2 aria-hidden="true" size={22} />
            <span>
              <strong>Ecran joueur</strong>
              <small>Briefing, round actif, input refuse, attente verification.</small>
            </span>
          </Link>
          <Link className="surface-tile" href="/parties/demo-round/waiting">
            <ShieldCheck aria-hidden="true" size={22} />
            <span>
              <strong>Waiting review</strong>
              <small>Manche terminee sans score provisoire expose.</small>
            </span>
          </Link>
          <Link className="surface-tile" href="/observe/parties/demo-party">
            <Eye aria-hidden="true" size={22} />
            <span>
              <strong>Observer readonly</strong>
              <small>Projection filtree sans inputs, reponses cachees ni paiement.</small>
            </span>
          </Link>
        </section>

        <section className="home-checks" aria-labelledby="home-checks-title">
          <h2 id="home-checks-title">Garanties visibles</h2>
          <dl className="state-list">
            <div>
              <dt>Autorite</dt>
              <dd>Serveur</dd>
            </div>
            <div>
              <dt>Publication score</dt>
              <dd>Bloquee</dd>
            </div>
            <div>
              <dt>Deadline</dt>
              <dd>Fermeture seulement</dd>
            </div>
            <div>
              <dt>Observer</dt>
              <dd>No-leak</dd>
            </div>
          </dl>
        </section>
      </div>
    </AppShell>
  );
}
