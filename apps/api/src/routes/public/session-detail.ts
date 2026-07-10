import { Hono } from "hono";
import { prisma, SessionVisibility } from "@session-jeu/db";
import { CAPACITY_REGISTRATION_STATUSES } from "../../sessions/statusGroups.js";

const sessionDetail = new Hono();

sessionDetail.get("/:code", async (c) => {
  const code = c.req.param("code");

  const session = await prisma.gameSession.findUnique({
    where: { code },
    include: {
      _count: {
        select: {
          registrations: {
            where: {
              status: {
                in: [...CAPACITY_REGISTRATION_STATUSES],
              },
            },
          },
        },
      },
    },
  });

  if (!session) {
    return c.json(
      {
        success: false,
        error: {
          code: "SESSION_NOT_FOUND",
          message: "Session not found",
        },
      },
      404,
    );
  }

  if (session.visibility === SessionVisibility.PRIVATE) {
    return c.json(
      {
        success: false,
        error: {
          code: "SESSION_NOT_VISIBLE",
          message: "This session requires an invitation to access",
        },
      },
      404,
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
      410,
    );
  }

  const placesRemaining = Math.max(0, session.maxPlayers - session._count.registrations);

  return c.json({
    success: true,
    data: {
      id: session.id,
      code: session.code,
      name: session.name,
      description: session.description,
      entryFee: session.entryFee,
      maxPlayers: session.maxPlayers,
      prizePool: session.prizePool,
      startTime: session.startTime?.toISOString() ?? null,
      endTime: session.endTime?.toISOString() ?? null,
      status: session.status,
      visibility: session.visibility,
      placesRemaining,
      registrationCount: session._count.registrations,
    },
  });
});

export default sessionDetail;
