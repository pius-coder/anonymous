export type UiParty = {
  id: string;
  code: string;
  name: string;
  status: "scheduled" | "preparation" | "live" | "review" | "published";
  startsAt: string;
  players: number;
  capacity: number;
  entryFee: string;
  game: string;
};

export const uiParties: UiParty[] = [
  {
    id: "party-aurora",
    code: "AURORA-21",
    name: "Nuit des stratèges",
    status: "live",
    startsAt: "Maintenant",
    players: 10,
    capacity: 12,
    entryFee: "2 500 FCFA",
    game: "Mémoire mystique",
  },
  {
    id: "party-orbit",
    code: "ORBIT-08",
    name: "Le cercle des rapides",
    status: "preparation",
    startsAt: "Dans 18 min",
    players: 7,
    capacity: 8,
    entryFee: "1 000 FCFA",
    game: "Duel d’échos",
  },
  {
    id: "party-cobalt",
    code: "COBALT-14",
    name: "Alliance du mercredi",
    status: "scheduled",
    startsAt: "Aujourd’hui, 19:30",
    players: 4,
    capacity: 12,
    entryFee: "Gratuit",
    game: "Labyrinthe coop",
  },
  {
    id: "party-nova",
    code: "NOVA-32",
    name: "Arène des énigmes",
    status: "review",
    startsAt: "Terminée à 14:42",
    players: 12,
    capacity: 12,
    entryFee: "3 000 FCFA",
    game: "Code secret",
  },
  {
    id: "party-pulse",
    code: "PULSE-09",
    name: "Survie en équipe",
    status: "published",
    startsAt: "Hier, 21:00",
    players: 8,
    capacity: 8,
    entryFee: "1 500 FCFA",
    game: "Dernière balise",
  },
];

export const uiUsers = [
  { id: "usr-001", name: "Aya M.", email: "aya@noya.cm", role: "PLAYER", status: "Actif", wallet: "8 400 FCFA" },
  { id: "usr-002", name: "Malo K.", email: "malo@noya.cm", role: "PLAYER", status: "En partie", wallet: "3 750 FCFA" },
  { id: "usr-003", name: "Sam N.", email: "sam@noya.cm", role: "SUPPORT", status: "Actif", wallet: "—" },
  { id: "usr-004", name: "Inès T.", email: "ines@noya.cm", role: "FINANCE", status: "Actif", wallet: "—" },
  { id: "usr-005", name: "Liam B.", email: "liam@noya.cm", role: "PLAYER", status: "Suspendu", wallet: "1 100 FCFA" },
];

export const uiTransactions = [
  { id: "PAY-84019", user: "Aya M.", type: "Dépôt", amount: "+5 000 FCFA", status: "Réussi", date: "Il y a 4 min" },
  { id: "FEE-84018", user: "Malo K.", type: "Droit d’entrée", amount: "−2 500 FCFA", status: "Réussi", date: "Il y a 11 min" },
  { id: "PAY-84017", user: "Liam B.", type: "Dépôt", amount: "+3 000 FCFA", status: "Échoué", date: "Il y a 18 min" },
  { id: "PRZ-84016", user: "Nora E.", type: "Gain", amount: "+12 000 FCFA", status: "Réussi", date: "Il y a 32 min" },
  { id: "RFD-84015", user: "Samy A.", type: "Remboursement", amount: "+1 500 FCFA", status: "En attente", date: "Il y a 1 h" },
];

export const uiMiniGames = [
  { id: "memory-mystic", name: "Mémoire mystique", family: "Solo", version: "1.4.0", status: "Actif", color: "emerald" },
  { id: "echo-duel", name: "Duel d’échos", family: "Duel", version: "1.2.1", status: "Actif", color: "violet" },
  { id: "coop-maze", name: "Labyrinthe coop", family: "Alliance", version: "0.9.4", status: "Bêta", color: "amber" },
  { id: "secret-code", name: "Code secret", family: "Équipe", version: "2.0.0", status: "Actif", color: "cyan" },
];
