export const observerParty = {
  id: "demo-party",
  code: "AURORA-21",
  name: "Nuit des stratèges",
  phase: "Manche 2 sur 4",
  roundStatus: "ROUND_ACTIVE",
  minigame: "Mémoire mystique",
  progress: 58,
  updatedAt: "15:42:18",
  participants: [
    { label: "Joueur 1", status: "Actif", progress: "7 étapes" },
    { label: "Joueur 2", status: "Terminé", progress: "10 étapes" },
    { label: "Joueur 3", status: "Actif", progress: "6 étapes" },
    { label: "Joueur 4", status: "Reconnexion", progress: "5 étapes" },
  ],
  events: [
    { time: "15:42", label: "Progression globale mise à jour" },
    { time: "15:40", label: "Un participant a terminé" },
    { time: "15:36", label: "Manche démarrée" },
  ],
  results: [
    { rank: 1, player: "Joueur 2", score: "8 420 pts", status: "Qualifié" },
    { rank: 2, player: "Joueur 1", score: "7 980 pts", status: "Qualifié" },
    { rank: 3, player: "Joueur 3", score: "7 310 pts", status: "Terminé" },
    { rank: 4, player: "Joueur 4", score: "6 880 pts", status: "Terminé" },
  ],
} as const;

export function getObserverParty(partyId: string) {
  return { ...observerParty, id: partyId };
}
