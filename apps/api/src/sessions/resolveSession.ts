import { prisma } from "@session-jeu/db";

export async function resolvePublicSessionId(identifier: string) {
  const session = await prisma.gameSession.findFirst({
    where: {
      OR: [{ id: identifier }, { code: identifier }],
    },
    select: { id: true, code: true },
  });

  return session?.id ?? identifier;
}
