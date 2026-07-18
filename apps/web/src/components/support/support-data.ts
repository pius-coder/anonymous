export const supportCases = [
  {
    id: "SUP-2041",
    partyId: "demo-party",
    playerId: "malo-k",
    player: "Malo K.",
    title: "Accès room non reçu",
    priority: "Urgent",
    status: "Ouvert",
    updated: "Il y a 3 min",
  },
  {
    id: "SUP-2040",
    partyId: "orbit-08",
    playerId: "liam-b",
    player: "Liam B.",
    title: "Paiement toujours en attente",
    priority: "Finance",
    status: "Assigné",
    updated: "Il y a 11 min",
  },
  {
    id: "SUP-2039",
    partyId: "cobalt-14",
    playerId: "aya-m",
    player: "Aya M.",
    title: "Nouvel appareil à vérifier",
    priority: "Normal",
    status: "En analyse",
    updated: "Il y a 24 min",
  },
] as const;

export const supportParty = {
  id: "demo-party",
  code: "AURORA-21",
  name: "Nuit des stratèges",
  phase: "ROUND_ACTIVE",
  participant: "Malo K.",
  playerId: "malo-k",
  connection: "Reconnexion",
  payment: "Confirmé",
  lastError: "La reconnexion live a expiré après 30 secondes.",
  updatedAt: "15:42:18",
  timeline: [
    {
      time: "15:42",
      title: "Reconnexion expirée",
      detail: "Le client n’a pas rétabli le flux dans la fenêtre autorisée.",
    },
    {
      time: "15:41",
      title: "Connexion interrompue",
      detail: "Perte réseau signalée; la place est conservée temporairement.",
    },
    { time: "15:36", title: "Entrée dans la manche", detail: "Admission et paiement confirmés." },
  ],
  incidents: [
    {
      id: "INC-118",
      severity: "Haute",
      owner: "Équipe Live",
      status: "En analyse",
      title: "Reconnexions instables sur réseau mobile",
    },
  ],
  audit: [
    { time: "15:43", actor: "Sam N.", action: "Dossier consulté", reason: "Diagnostic SUP-2041" },
    {
      time: "15:39",
      actor: "Système",
      action: "Erreur redigée enregistrée",
      reason: "Timeout de reconnexion",
    },
  ],
} as const;

export function getSupportParty(partyId: string) {
  return { ...supportParty, id: partyId };
}
