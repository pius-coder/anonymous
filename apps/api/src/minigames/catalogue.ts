import { z } from "zod";
import {
  MiniGameFamily,
  MiniGamePlayerMode,
  Prisma,
  prisma,
} from "@session-jeu/db";
import { admissionLockForFamily } from "@session-jeu/game-engine";

export type MiniGameDefinitionSeed = {
  key: string;
  name: string;
  description: string;
  family: MiniGameFamily;
  playerMode: MiniGamePlayerMode;
  resolverId: "solo-score" | "duel-score";
  version: number;
  configSchema: Prisma.InputJsonObject;
  defaultConfig: Prisma.InputJsonObject;
  allowedActions: Array<{
    type: string;
    maxPerWindow: number;
    windowMs: number;
    requiresNonce: boolean;
  }>;
  antiCheatPolicy: Prisma.InputJsonObject;
  clientStateSchema: Prisma.InputJsonObject;
  uiCopy: Prisma.InputJsonObject;
};

const commonAntiCheat = {
  serverTimersOnly: true,
  nonceRequired: true,
  rejectAfterDeadline: true,
  sensitiveStateKeysBlocked: ["answer", "answers", "solution", "seed", "targetValue"],
};

const MVP_MINIGAME_SCHEMA_PLACEHOLDER = {
  type: "object",
  required: ["durationSeconds", "winnersCount", "maxAttempts"],
  properties: {
    durationSeconds: { type: "integer", minimum: 10, maximum: 180 },
    winnersCount: { type: "integer", minimum: 1, maximum: 100 },
    maxAttempts: { type: "integer", minimum: 1, maximum: 200 },
  },
} as const;

const soloScoreSchema = z.object({
  durationSeconds: z.number().int().min(10).max(180),
  winnersCount: z.number().int().min(1).max(100),
  maxAttempts: z.number().int().min(1).max(200),
});

const duelScoreSchema = z.object({
  durationSeconds: z.number().int().min(5).max(120),
  roundsToWin: z.number().int().min(1).max(5),
  falseStartPenaltyMs: z.number().int().min(0).max(5000),
});

const survivalScoreSchema = z.object({
  durationSeconds: z.number().int().min(15).max(240),
  winnersCount: z.number().int().min(1).max(100),
  hazardIntervalMs: z.number().int().min(500).max(10000),
});

const groupScoreSchema = z.object({
  durationSeconds: z.number().int().min(20).max(240),
  winnersCount: z.number().int().min(1).max(100),
  teamSize: z.number().int().min(2).max(12),
  maxAttempts: z.number().int().min(1).max(200),
});

const hiddenRoleScoreSchema = z.object({
  durationSeconds: z.number().int().min(30).max(300),
  winnersCount: z.number().int().min(1).max(100),
  discussionSeconds: z.number().int().min(10).max(120),
  accusationsPerPlayer: z.number().int().min(1).max(5),
});

const configKinds = {
  solo: {
    schema: MVP_MINIGAME_SCHEMA_PLACEHOLDER,
    validator: soloScoreSchema,
    defaultConfig: { durationSeconds: 60, winnersCount: 3, maxAttempts: 20 },
  },
  duel: {
    schema: {
      type: "object",
      required: ["durationSeconds", "roundsToWin", "falseStartPenaltyMs"],
      properties: {
        durationSeconds: { type: "integer", minimum: 5, maximum: 120 },
        roundsToWin: { type: "integer", minimum: 1, maximum: 5 },
        falseStartPenaltyMs: { type: "integer", minimum: 0, maximum: 5000 },
      },
    },
    validator: duelScoreSchema,
    defaultConfig: { durationSeconds: 30, roundsToWin: 2, falseStartPenaltyMs: 1000 },
  },
  survival: {
    schema: {
      type: "object",
      required: ["durationSeconds", "winnersCount", "hazardIntervalMs"],
      properties: {
        durationSeconds: { type: "integer", minimum: 15, maximum: 240 },
        winnersCount: { type: "integer", minimum: 1, maximum: 100 },
        hazardIntervalMs: { type: "integer", minimum: 500, maximum: 10000 },
      },
    },
    validator: survivalScoreSchema,
    defaultConfig: { durationSeconds: 90, winnersCount: 5, hazardIntervalMs: 3000 },
  },
  group: {
    schema: {
      type: "object",
      required: ["durationSeconds", "winnersCount", "teamSize", "maxAttempts"],
      properties: {
        durationSeconds: { type: "integer", minimum: 20, maximum: 240 },
        winnersCount: { type: "integer", minimum: 1, maximum: 100 },
        teamSize: { type: "integer", minimum: 2, maximum: 12 },
        maxAttempts: { type: "integer", minimum: 1, maximum: 200 },
      },
    },
    validator: groupScoreSchema,
    defaultConfig: { durationSeconds: 90, winnersCount: 6, teamSize: 3, maxAttempts: 30 },
  },
  hidden: {
    schema: {
      type: "object",
      required: ["durationSeconds", "winnersCount", "discussionSeconds", "accusationsPerPlayer"],
      properties: {
        durationSeconds: { type: "integer", minimum: 30, maximum: 300 },
        winnersCount: { type: "integer", minimum: 1, maximum: 100 },
        discussionSeconds: { type: "integer", minimum: 10, maximum: 120 },
        accusationsPerPlayer: { type: "integer", minimum: 1, maximum: 5 },
      },
    },
    validator: hiddenRoleScoreSchema,
    defaultConfig: {
      durationSeconds: 120,
      winnersCount: 6,
      discussionSeconds: 45,
      accusationsPerPlayer: 1,
    },
  },
} as const;

type ConfigKind = keyof typeof configKinds;

type MiniGameBlueprint = {
  key: string;
  name: string;
  description: string;
  family: MiniGameFamily;
  playerMode: MiniGamePlayerMode;
  resolverId: "solo-score" | "duel-score";
  configKind: ConfigKind;
  actionType: string;
  maxPerWindow: number;
  windowMs: number;
  clientStateSchema: Prisma.InputJsonObject;
  objective: string;
  antiCheatExtra?: Prisma.InputJsonObject;
};

const miniGameBlueprints: MiniGameBlueprint[] = [
  {
    key: "memory-sequence",
    name: "Sequence memoire",
    description: "Reproduire une sequence affichee par le serveur, classement par manches reussies.",
    family: MiniGameFamily.SOLO,
    playerMode: MiniGamePlayerMode.SOLO,
    resolverId: "solo-score",
    configKind: "solo",
    actionType: "sequence-input",
    maxPerWindow: 3,
    windowMs: 1000,
    clientStateSchema: { phase: "string", roundNum: "number", deadlineEpochMs: "number" },
    objective: "Memorise la suite et reproduis-la dans l'ordre.",
  },
  {
    key: "rapid-calculation",
    name: "Calcul rapide",
    description: "Serie de calculs server-side, classement par bonnes reponses puis temps.",
    family: MiniGameFamily.SOLO,
    playerMode: MiniGamePlayerMode.SOLO,
    resolverId: "solo-score",
    configKind: "solo",
    actionType: "answer",
    maxPerWindow: 4,
    windowMs: 1000,
    clientStateSchema: { phase: "string", promptId: "string", deadlineEpochMs: "number" },
    objective: "Reponds au plus grand nombre de calculs avant la fin.",
  },
  {
    key: "target-precision",
    name: "Precision de tir",
    description: "Cibles generees cote serveur, classement par touches et precision.",
    family: MiniGameFamily.SOLO,
    playerMode: MiniGamePlayerMode.SOLO,
    resolverId: "solo-score",
    configKind: "solo",
    actionType: "target-hit",
    maxPerWindow: 8,
    windowMs: 1000,
    clientStateSchema: { phase: "string", visibleTargets: "array", deadlineEpochMs: "number" },
    objective: "Touche les cibles visibles, evite les clics inutiles.",
    antiCheatExtra: { hitboxValidatedServerSide: true },
  },
  {
    key: "pattern-recall",
    name: "Rappel de motif",
    description: "Retrouver un motif affiche temporairement, score par exactitude serveur.",
    family: MiniGameFamily.SOLO,
    playerMode: MiniGamePlayerMode.SOLO,
    resolverId: "solo-score",
    configKind: "solo",
    actionType: "pattern-input",
    maxPerWindow: 3,
    windowMs: 1000,
    clientStateSchema: { phase: "string", patternId: "string", deadlineEpochMs: "number" },
    objective: "Recompose le motif apres sa disparition.",
  },
  {
    key: "logic-grid",
    name: "Grille logique",
    description: "Resoudre des contraintes simples generees serveur, classement par bonnes grilles.",
    family: MiniGameFamily.SOLO,
    playerMode: MiniGamePlayerMode.SOLO,
    resolverId: "solo-score",
    configKind: "solo",
    actionType: "grid-submit",
    maxPerWindow: 2,
    windowMs: 1000,
    clientStateSchema: { phase: "string", puzzleId: "string", deadlineEpochMs: "number" },
    objective: "Valide la grille la plus coherente possible.",
  },
  {
    key: "timing-window",
    name: "Fenetre parfaite",
    description: "Appuyer dans une fenetre de timing serveur, score par precision.",
    family: MiniGameFamily.SOLO,
    playerMode: MiniGamePlayerMode.SOLO,
    resolverId: "solo-score",
    configKind: "solo",
    actionType: "timing-tap",
    maxPerWindow: 5,
    windowMs: 1000,
    clientStateSchema: { phase: "string", markerId: "string", deadlineEpochMs: "number" },
    objective: "Tape au plus proche du signal autorise.",
  },
  {
    key: "pure-reaction-duel",
    name: "Reaction pure duel",
    description: "Duel de reaction apres signal serveur, faux depart penalise.",
    family: MiniGameFamily.DUEL,
    playerMode: MiniGamePlayerMode.DUEL,
    resolverId: "duel-score",
    configKind: "duel",
    actionType: "reaction-click",
    maxPerWindow: 2,
    windowMs: 1000,
    clientStateSchema: { phase: "string", signalVisible: "boolean", deadlineEpochMs: "number" },
    objective: "Clique seulement apres le signal.",
    antiCheatExtra: { latencyCorrectionRequired: true },
  },
  {
    key: "mirror-match",
    name: "Miroir duel",
    description: "Reproduire plus vite que l'adversaire une action serveur.",
    family: MiniGameFamily.DUEL,
    playerMode: MiniGamePlayerMode.DUEL,
    resolverId: "duel-score",
    configKind: "duel",
    actionType: "mirror-input",
    maxPerWindow: 3,
    windowMs: 1000,
    clientStateSchema: { phase: "string", promptId: "string", deadlineEpochMs: "number" },
    objective: "Copie le signal avant ton adversaire.",
    antiCheatExtra: { latencyCorrectionRequired: true },
  },
  {
    key: "quick-draw",
    name: "Degainage",
    description: "Duel a faux signaux, penalite sur depart anticipe.",
    family: MiniGameFamily.DUEL,
    playerMode: MiniGamePlayerMode.DUEL,
    resolverId: "duel-score",
    configKind: "duel",
    actionType: "draw-click",
    maxPerWindow: 2,
    windowMs: 1000,
    clientStateSchema: { phase: "string", signalId: "string", deadlineEpochMs: "number" },
    objective: "Clique uniquement sur le vrai signal.",
    antiCheatExtra: { latencyCorrectionRequired: true },
  },
  {
    key: "duel-calculation",
    name: "Calcul duel",
    description: "Face-a-face de calcul mental, score par exactitude puis vitesse.",
    family: MiniGameFamily.DUEL,
    playerMode: MiniGamePlayerMode.DUEL,
    resolverId: "duel-score",
    configKind: "duel",
    actionType: "duel-answer",
    maxPerWindow: 4,
    windowMs: 1000,
    clientStateSchema: { phase: "string", promptId: "string", deadlineEpochMs: "number" },
    objective: "Reponds juste avant ton adversaire.",
  },
  {
    key: "rhythm-duel",
    name: "Rythme duel",
    description: "Suite de taps horodates serveur, score par precision moyenne.",
    family: MiniGameFamily.DUEL,
    playerMode: MiniGamePlayerMode.DUEL,
    resolverId: "duel-score",
    configKind: "duel",
    actionType: "rhythm-tap",
    maxPerWindow: 8,
    windowMs: 1000,
    clientStateSchema: { phase: "string", beatId: "string", deadlineEpochMs: "number" },
    objective: "Garde le rythme plus precisement que ton adversaire.",
    antiCheatExtra: { latencyCorrectionRequired: true },
  },
  {
    key: "bluff-duel",
    name: "Bluff duel",
    description: "Choix simultane et lecture de pattern, score par prediction correcte.",
    family: MiniGameFamily.DUEL,
    playerMode: MiniGamePlayerMode.DUEL,
    resolverId: "duel-score",
    configKind: "duel",
    actionType: "duel-choice",
    maxPerWindow: 2,
    windowMs: 1000,
    clientStateSchema: { phase: "string", choiceWindowId: "string", deadlineEpochMs: "number" },
    objective: "Anticipe le choix adverse sans hasard dominant.",
  },
  {
    key: "trust-bridge",
    name: "Pont de confiance",
    description: "Alliance forcee: deux joueurs doivent confirmer la meme route.",
    family: MiniGameFamily.ALLIANCE,
    playerMode: MiniGamePlayerMode.GROUP,
    resolverId: "solo-score",
    configKind: "group",
    actionType: "route-choice",
    maxPerWindow: 2,
    windowMs: 1000,
    clientStateSchema: { phase: "string", pairId: "string", deadlineEpochMs: "number" },
    objective: "Coordonne une route commune avec ton allie impose.",
  },
  {
    key: "shared-code",
    name: "Code partage",
    description: "Chaque allie voit une partie publique du code, validation serveur commune.",
    family: MiniGameFamily.ALLIANCE,
    playerMode: MiniGamePlayerMode.GROUP,
    resolverId: "solo-score",
    configKind: "group",
    actionType: "code-submit",
    maxPerWindow: 3,
    windowMs: 1000,
    clientStateSchema: { phase: "string", fragmentId: "string", deadlineEpochMs: "number" },
    objective: "Assemble le code avec ton binome.",
  },
  {
    key: "pair-memory",
    name: "Memoire binome",
    description: "Deux joueurs retiennent des fragments differents et marquent ensemble.",
    family: MiniGameFamily.ALLIANCE,
    playerMode: MiniGamePlayerMode.GROUP,
    resolverId: "solo-score",
    configKind: "group",
    actionType: "pair-recall",
    maxPerWindow: 3,
    windowMs: 1000,
    clientStateSchema: { phase: "string", fragmentId: "string", deadlineEpochMs: "number" },
    objective: "Combine les souvenirs de ton alliance.",
  },
  {
    key: "alliance-balance",
    name: "Balance alliance",
    description: "Repartir des poids sans depasser les limites serveur.",
    family: MiniGameFamily.ALLIANCE,
    playerMode: MiniGamePlayerMode.GROUP,
    resolverId: "solo-score",
    configKind: "group",
    actionType: "balance-submit",
    maxPerWindow: 3,
    windowMs: 1000,
    clientStateSchema: { phase: "string", boardId: "string", deadlineEpochMs: "number" },
    objective: "Equilibre la charge de ton alliance.",
  },
  {
    key: "split-focus",
    name: "Attention partagee",
    description: "Chaque allie gere une partie de l'ecran, score par synchronisation.",
    family: MiniGameFamily.ALLIANCE,
    playerMode: MiniGamePlayerMode.GROUP,
    resolverId: "solo-score",
    configKind: "group",
    actionType: "focus-input",
    maxPerWindow: 6,
    windowMs: 1000,
    clientStateSchema: { phase: "string", laneId: "string", deadlineEpochMs: "number" },
    objective: "Garde ta voie propre pendant que l'autre fait de meme.",
  },
  {
    key: "relay-logic",
    name: "Relais logique",
    description: "Resolution par etapes ou chaque membre valide une partie.",
    family: MiniGameFamily.ALLIANCE,
    playerMode: MiniGamePlayerMode.GROUP,
    resolverId: "solo-score",
    configKind: "group",
    actionType: "relay-submit",
    maxPerWindow: 3,
    windowMs: 1000,
    clientStateSchema: { phase: "string", stepId: "string", deadlineEpochMs: "number" },
    objective: "Passe le relais avec une reponse correcte.",
  },
  {
    key: "team-relay",
    name: "Relais equipe",
    description: "Equipe libre: enchainer des validations serveur dans le bon ordre.",
    family: MiniGameFamily.TEAM,
    playerMode: MiniGamePlayerMode.TEAM,
    resolverId: "solo-score",
    configKind: "group",
    actionType: "team-relay",
    maxPerWindow: 3,
    windowMs: 1000,
    clientStateSchema: { phase: "string", teamId: "string", deadlineEpochMs: "number" },
    objective: "Fais avancer ton equipe sans casser l'ordre.",
  },
  {
    key: "squad-signal",
    name: "Signal escouade",
    description: "Tous les membres repondent au meme signal, score par coherence.",
    family: MiniGameFamily.TEAM,
    playerMode: MiniGamePlayerMode.TEAM,
    resolverId: "solo-score",
    configKind: "group",
    actionType: "squad-signal",
    maxPerWindow: 4,
    windowMs: 1000,
    clientStateSchema: { phase: "string", signalId: "string", deadlineEpochMs: "number" },
    objective: "Reagis avec ton escouade au signal serveur.",
  },
  {
    key: "formation-hold",
    name: "Formation stable",
    description: "Maintenir une formation logique selon consignes serveur.",
    family: MiniGameFamily.TEAM,
    playerMode: MiniGamePlayerMode.TEAM,
    resolverId: "solo-score",
    configKind: "group",
    actionType: "formation-move",
    maxPerWindow: 10,
    windowMs: 1000,
    clientStateSchema: { phase: "string", formationId: "string", deadlineEpochMs: "number" },
    objective: "Garde la formation demandee avec ton equipe.",
    antiCheatExtra: { positionValidatedServerSide: true },
  },
  {
    key: "team-calculation",
    name: "Calcul equipe",
    description: "Problemes repartis entre membres, score par total correct.",
    family: MiniGameFamily.TEAM,
    playerMode: MiniGamePlayerMode.TEAM,
    resolverId: "solo-score",
    configKind: "group",
    actionType: "team-answer",
    maxPerWindow: 4,
    windowMs: 1000,
    clientStateSchema: { phase: "string", promptId: "string", deadlineEpochMs: "number" },
    objective: "Cumule les bonnes reponses avec ton equipe.",
  },
  {
    key: "resource-sort",
    name: "Tri ressources",
    description: "Classer des ressources dans les bonnes files, validation serveur.",
    family: MiniGameFamily.TEAM,
    playerMode: MiniGamePlayerMode.TEAM,
    resolverId: "solo-score",
    configKind: "group",
    actionType: "resource-sort",
    maxPerWindow: 6,
    windowMs: 1000,
    clientStateSchema: { phase: "string", batchId: "string", deadlineEpochMs: "number" },
    objective: "Trie vite sans erreur avec ton equipe.",
  },
  {
    key: "synchronized-tap",
    name: "Tap synchronise",
    description: "Les membres doivent agir dans une fenetre commune.",
    family: MiniGameFamily.TEAM,
    playerMode: MiniGamePlayerMode.TEAM,
    resolverId: "solo-score",
    configKind: "group",
    actionType: "sync-tap",
    maxPerWindow: 5,
    windowMs: 1000,
    clientStateSchema: { phase: "string", syncWindowId: "string", deadlineEpochMs: "number" },
    objective: "Synchronise ton action avec le groupe.",
  },
  {
    key: "safe-zones",
    name: "Zones sures",
    description: "Survie collective a zones sures, classement par statut et temps de survie.",
    family: MiniGameFamily.SURVIVAL,
    playerMode: MiniGamePlayerMode.GROUP,
    resolverId: "solo-score",
    configKind: "survival",
    actionType: "move",
    maxPerWindow: 15,
    windowMs: 1000,
    clientStateSchema: { phase: "string", safeZones: "array", deadlineEpochMs: "number" },
    objective: "Reste dans une zone sure quand le danger tombe.",
    antiCheatExtra: { positionValidatedServerSide: true },
  },
  {
    key: "shrinking-floor",
    name: "Sol retrecissant",
    description: "La zone jouable se reduit par paliers serveur.",
    family: MiniGameFamily.SURVIVAL,
    playerMode: MiniGamePlayerMode.GROUP,
    resolverId: "solo-score",
    configKind: "survival",
    actionType: "move",
    maxPerWindow: 15,
    windowMs: 1000,
    clientStateSchema: { phase: "string", floorStep: "number", deadlineEpochMs: "number" },
    objective: "Reste dans le sol encore valide.",
    antiCheatExtra: { positionValidatedServerSide: true },
  },
  {
    key: "danger-sweep",
    name: "Rayon balayeur",
    description: "Eviter une trajectoire deterministe diffusee par le serveur.",
    family: MiniGameFamily.SURVIVAL,
    playerMode: MiniGamePlayerMode.GROUP,
    resolverId: "solo-score",
    configKind: "survival",
    actionType: "move",
    maxPerWindow: 15,
    windowMs: 1000,
    clientStateSchema: { phase: "string", sweepId: "string", deadlineEpochMs: "number" },
    objective: "Evite le rayon jusqu'a la fin.",
    antiCheatExtra: { positionValidatedServerSide: true },
  },
  {
    key: "last-light",
    name: "Derniere lumiere",
    description: "Se deplacer entre zones eclairees avant extinction.",
    family: MiniGameFamily.SURVIVAL,
    playerMode: MiniGamePlayerMode.GROUP,
    resolverId: "solo-score",
    configKind: "survival",
    actionType: "move",
    maxPerWindow: 12,
    windowMs: 1000,
    clientStateSchema: { phase: "string", lightId: "string", deadlineEpochMs: "number" },
    objective: "Rejoins une lumiere active avant extinction.",
    antiCheatExtra: { positionValidatedServerSide: true },
  },
  {
    key: "obstacle-path",
    name: "Chemin obstacles",
    description: "Choisir des positions valides pendant que le chemin change.",
    family: MiniGameFamily.SURVIVAL,
    playerMode: MiniGamePlayerMode.GROUP,
    resolverId: "solo-score",
    configKind: "survival",
    actionType: "path-step",
    maxPerWindow: 10,
    windowMs: 1000,
    clientStateSchema: { phase: "string", pathId: "string", deadlineEpochMs: "number" },
    objective: "Avance sans toucher les obstacles serveur.",
    antiCheatExtra: { positionValidatedServerSide: true },
  },
  {
    key: "endurance-count",
    name: "Compteur endurance",
    description: "Maintenir un rythme d'actions valide sans depasser les caps.",
    family: MiniGameFamily.SURVIVAL,
    playerMode: MiniGamePlayerMode.GROUP,
    resolverId: "solo-score",
    configKind: "survival",
    actionType: "endurance-tap",
    maxPerWindow: 6,
    windowMs: 1000,
    clientStateSchema: { phase: "string", targetPaceId: "string", deadlineEpochMs: "number" },
    objective: "Tiens le rythme sans spammer.",
  },
  {
    key: "signal-detective",
    name: "Detective signaux",
    description: "Identifier les signaux incoherents dans un tour role cache.",
    family: MiniGameFamily.HIDDEN_ROLE,
    playerMode: MiniGamePlayerMode.GROUP,
    resolverId: "solo-score",
    configKind: "hidden",
    actionType: "signal-accuse",
    maxPerWindow: 2,
    windowMs: 1000,
    clientStateSchema: { phase: "string", clueRound: "number", deadlineEpochMs: "number" },
    objective: "Repere les signaux suspects sans information secrete.",
  },
  {
    key: "silent-vote",
    name: "Vote silencieux",
    description: "Vote simultane borne par nonce, score par coherence collective.",
    family: MiniGameFamily.HIDDEN_ROLE,
    playerMode: MiniGamePlayerMode.GROUP,
    resolverId: "solo-score",
    configKind: "hidden",
    actionType: "silent-vote",
    maxPerWindow: 1,
    windowMs: 1000,
    clientStateSchema: { phase: "string", voteRound: "number", deadlineEpochMs: "number" },
    objective: "Vote une seule fois dans la fenetre serveur.",
  },
  {
    key: "decoy-hunt",
    name: "Chasse leurre",
    description: "Distinguer les indices valides des leurres publics.",
    family: MiniGameFamily.HIDDEN_ROLE,
    playerMode: MiniGamePlayerMode.GROUP,
    resolverId: "solo-score",
    configKind: "hidden",
    actionType: "clue-pick",
    maxPerWindow: 3,
    windowMs: 1000,
    clientStateSchema: { phase: "string", clueSetId: "string", deadlineEpochMs: "number" },
    objective: "Choisis les indices fiables.",
  },
  {
    key: "role-memory",
    name: "Memoire roles",
    description: "Se souvenir des declarations publiques precedentes.",
    family: MiniGameFamily.HIDDEN_ROLE,
    playerMode: MiniGamePlayerMode.GROUP,
    resolverId: "solo-score",
    configKind: "hidden",
    actionType: "role-recall",
    maxPerWindow: 3,
    windowMs: 1000,
    clientStateSchema: { phase: "string", statementRound: "number", deadlineEpochMs: "number" },
    objective: "Retrouve les contradictions dans les declarations.",
  },
  {
    key: "suspect-pattern",
    name: "Pattern suspect",
    description: "Comparer des patterns publics pour identifier une anomalie.",
    family: MiniGameFamily.HIDDEN_ROLE,
    playerMode: MiniGamePlayerMode.GROUP,
    resolverId: "solo-score",
    configKind: "hidden",
    actionType: "pattern-accuse",
    maxPerWindow: 2,
    windowMs: 1000,
    clientStateSchema: { phase: "string", patternRound: "number", deadlineEpochMs: "number" },
    objective: "Trouve le comportement qui ne colle pas.",
  },
  {
    key: "alibi-check",
    name: "Verification alibi",
    description: "Controler des alibis publics avec une limite d'accusations.",
    family: MiniGameFamily.HIDDEN_ROLE,
    playerMode: MiniGamePlayerMode.GROUP,
    resolverId: "solo-score",
    configKind: "hidden",
    actionType: "alibi-check",
    maxPerWindow: 2,
    windowMs: 1000,
    clientStateSchema: { phase: "string", alibiRound: "number", deadlineEpochMs: "number" },
    objective: "Verifie l'alibi le plus incoherent.",
  },
];

export const MVP_MINIGAME_DEFINITIONS: MiniGameDefinitionSeed[] = miniGameBlueprints.map(
  (blueprint) => {
    const config = configKinds[blueprint.configKind];
    return {
      key: blueprint.key,
      name: blueprint.name,
      description: blueprint.description,
      family: blueprint.family,
      playerMode: blueprint.playerMode,
      resolverId: blueprint.resolverId,
      version: 1,
      configSchema: config.schema,
      defaultConfig: config.defaultConfig,
      allowedActions: [
        {
          type: blueprint.actionType,
          maxPerWindow: blueprint.maxPerWindow,
          windowMs: blueprint.windowMs,
          requiresNonce: true,
        },
      ],
      antiCheatPolicy: {
        ...commonAntiCheat,
        admissionPolicy: {
          lockAt: admissionLockForFamily(blueprint.family),
          lateAfterLock: "ELIMINATE_NO_SHOW",
        },
        ...(blueprint.antiCheatExtra ?? {}),
      },
      clientStateSchema: blueprint.clientStateSchema,
      uiCopy: { objective: blueprint.objective },
    };
  },
);

const configValidators = Object.fromEntries(
  miniGameBlueprints.map((blueprint) => [
    blueprint.key,
    configKinds[blueprint.configKind].validator,
  ]),
) as Record<string, z.ZodType>;

export function validateMiniGameConfig(input: { key: string; config: unknown }) {
  const schema = configValidators[input.key];
  if (!schema) return { type: "unknown-minigame" as const };
  const result = schema.safeParse(input.config);
  if (!result.success) {
    return { type: "invalid" as const, issues: result.error.issues };
  }
  return { type: "ok" as const, config: result.data };
}

export function validateMiniGameAction(input: {
  definition: Pick<MiniGameDefinitionSeed, "allowedActions">;
  actionType: string;
  actionNonce: string;
  seenNonces: Set<string>;
  deadlineAt: Date;
  now?: Date;
  recentActionCount: number;
}) {
  const now = input.now ?? new Date();
  const rule = input.definition.allowedActions.find((action) => action.type === input.actionType);
  if (!rule) return { type: "action-not-allowed" as const };
  if (input.deadlineAt <= now) return { type: "action-too-late" as const };
  if (rule.requiresNonce && input.seenNonces.has(input.actionNonce)) {
    return { type: "duplicate-action" as const };
  }
  if (input.recentActionCount >= rule.maxPerWindow) {
    return { type: "rate-limit" as const, policy: rule };
  }
  return { type: "ok" as const, policy: rule };
}

export async function listMiniGames() {
  return prisma.miniGameDefinition.findMany({
    orderBy: [{ family: "asc" }, { key: "asc" }, { version: "desc" }],
  });
}

export async function setMiniGameEnabled(input: { id: string; enabled: boolean; adminUserId: string }) {
  const updated = await prisma.miniGameDefinition.update({
    where: { id: input.id },
    data: { enabled: input.enabled },
  });
  await prisma.auditLog.create({
    data: {
      userId: input.adminUserId,
      action: input.enabled ? "minigame.enabled" : "minigame.disabled",
      entity: "MiniGameDefinition",
      entityId: updated.id,
      newData: { key: updated.key, version: updated.version, enabled: updated.enabled },
    },
  });
  return updated;
}

export async function findMiniGameDefinition(input: { key: string; version?: number }) {
  return prisma.miniGameDefinition.findFirst({
    where: { key: input.key, ...(input.version ? { version: input.version } : {}) },
    orderBy: { version: "desc" },
  });
}
