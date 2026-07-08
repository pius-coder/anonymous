import {
  PrismaClient,
  Prisma,
  GameSessionStatus,
  LedgerDirection,
  LedgerType,
  LivePhase,
  MiniGameFamily,
  MiniGamePlayerMode,
  PaymentStatus,
  PlayerConnectionStatus,
  RoundOutcomeStatus,
  RoundStatus,
  SessionRegistrationStatus,
  SessionVisibility,
  UserRole,
} from "@prisma/client";

export const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

export {
  Prisma,
  GameSessionStatus,
  LedgerDirection,
  LedgerType,
  LivePhase,
  MiniGameFamily,
  MiniGamePlayerMode,
  PaymentStatus,
  PlayerConnectionStatus,
  RoundOutcomeStatus,
  RoundStatus,
  SessionRegistrationStatus,
  SessionVisibility,
  UserRole,
};
export default prisma;
