const marqueeItems = [
  "Lobby",
  "Check-in",
  "Rounds courts",
  "Timer serveur",
  "Scores auditables",
  "Wallet interne",
  "Support trace",
];

export function FeatureMarquee() {
  return (
    <section className="overflow-hidden border-y-2 border-border bg-foreground py-3 text-background">
      <div className="flex w-max animate-marquee">
        {[0, 1].map((loop) => (
          <ul key={loop} className="flex shrink-0 items-center" aria-hidden={loop > 0}>
            {marqueeItems.map((item) => (
              <li
                key={`${loop}-${item}`}
                className="flex items-center gap-4 px-5 font-head text-sm font-black uppercase tracking-wider"
              >
                <span className="text-primary">★</span>
                {item}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
