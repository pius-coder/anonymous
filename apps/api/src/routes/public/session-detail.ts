import { Hono } from "hono";
import { prisma, SessionRegistrationStatus } from "@session-jeu/db";

const sessionDetail = new Hono();

sessionDetail.get("/:code", async (c) => {
  const code = c.req.param("code");

  const session = await prisma.gameSession.findUnique({
    where: { code },
    include: {
      _count: {
        select: {
          registrations: {
            where: { status: { in: [SessionRegistrationStatus.PENDING, SessionRegistrationStatus.CONFIRMED] } },
          },
        },
      },
    },
  });

  if (!session || !session.isPublic) {
    return c.json(
      {
        success: false,
        error: {
          code: "SESSION_NOT_FOUND",
          message: "Session not found",
        },
      },
      404
    );
  }

  if (session.status === "CANCELLED" || session.status === "COMPLETED") {
    return c.json(
      {
        success: false,
        error: {
          code: "SESSION_CLOSED",
          message: "This session is no longer accepting registrations",
        },
      },
      410
    );
  }

  const placesRemaining = Math.max(
    0,
    session.maxPlayers - session._count.registrations
  );

  return c.json({
    success: true,
    data: {
      code: session.code,
      name: session.name,
      description: session.description,
      entryFee: session.entryFee,
      maxPlayers: session.maxPlayers,
      prizePool: session.prizePool,
      startTime: session.startTime?.toISOString() ?? null,
      endTime: session.endTime?.toISOString() ?? null,
      status: session.status,
      isPublic: session.isPublic,
      placesRemaining,
      registrationCount: session._count.registrations,
    },
  });
});

export default sessionDetail;
