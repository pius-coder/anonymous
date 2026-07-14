const foundationLayers = [
  "Produit",
  "UX",
  "Architecture",
  "Contrats Protobuf",
  "Temps reel",
  "Persistence",
  "Observabilite",
];

export default function HomePage() {
  return (
    <main className="foundation-shell">
      <section className="foundation-panel" aria-labelledby="foundation-title">
        <p className="eyebrow">v0.1</p>
        <h1 id="foundation-title">Socle technique propre</h1>
        <p className="summary">
          Le legacy metier et les parcours live melanges ont ete retires. La reconstruction part
          des documents d architecture, des couches et des contrats.
        </p>
        <ul>
          {foundationLayers.map((layer) => (
            <li key={layer}>{layer}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

