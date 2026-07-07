import { PrismaClient, GameSessionStatus, SessionRegistrationStatus } from "@prisma/client";

export const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

export { GameSessionStatus, SessionRegistrationStatus };
export default prisma;
