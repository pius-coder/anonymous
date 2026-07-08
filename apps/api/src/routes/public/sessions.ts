import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  prisma,
  GameSessionStatus,
  SessionRegistrationStatus,
  SessionVisibility,
} from "@session-jeu/db";
import { PAGINATION_DEFAULTS } from "@session-jeu/shared";

const sessions = new Hono();

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION_DEFAULTS.PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION_DEFAULTS.MAX_LIMIT)
    .default(PAGINATION_DEFAULTS.LIMIT),
});

sessions.get("/", zValidator("query", querySchema), async (c) => {
  const { page, limit } = c.req.valid("query");
  const skip = (page - 1) * limit;

  const where = {
    visibility: SessionVisibility.PUBLIC,
    status: { in: [GameSessionStatus.PUBLISHED, GameSessionStatus.ACTIVE] },
  };

  const [total, sessions] = await Promise.all([
    prisma.gameSession.count({ where }),
    prisma.gameSession.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startTime: "asc" },
      include: {
        _count: {
          select: {
            registrations: {
              where: {
                status: {
                  in: [SessionRegistrationStatus.PAYMENT_PENDING, SessionRegistrationStatus.PAID],
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const data = sessions.map((s) => ({
    code: s.code,
    name: s.name,
    description: s.description,
    entryFee: s.entryFee,
    maxPlayers: s.maxPlayers,
    prizePool: s.prizePool,
    startTime: s.startTime?.toISOString() ?? null,
    endTime: s.endTime?.toISOString() ?? null,
    status: s.status,
    visibility: s.visibility,
    placesRemaining: Math.max(0, s.maxPlayers - s._count.registrations),
  }));

  return c.json({
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export default sessions;
