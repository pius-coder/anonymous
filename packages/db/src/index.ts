import {
  PrismaClient,
  Prisma,
  GameSessionStatus,
  GameResultStatus,
  DisputeWindowStatus,
  LedgerDirection,
  LedgerType,
  LivePhase,
  MiniGameFamily,
  MiniGamePlayerMode,
  PaymentStatus,
  PlayerConnectionStatus,
  PrizeDistributionStatus,
  RoundingRemainderPolicy,
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
  GameResultStatus,
  DisputeWindowStatus,
  LedgerDirection,
  LedgerType,
  LivePhase,
  MiniGameFamily,
  MiniGamePlayerMode,
  PaymentStatus,
  PlayerConnectionStatus,
  PrizeDistributionStatus,
  RoundingRemainderPolicy,
  RoundOutcomeStatus,
  RoundStatus,
  SessionRegistrationStatus,
  SessionVisibility,
  UserRole,
};
export default prisma;
