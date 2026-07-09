import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  prisma,
  GameSessionStatus,
  Prisma,
  SessionVisibility,
} from "@session-jeu/db";
import { PAGINATION_DEFAULTS } from "@session-jeu/shared";
import { CAPACITY_REGISTRATION_STATUSES } from "../../sessions/statusGroups.js";

const sessions = new Hono();

const FILTER_VALUES = ["all", "open", "live", "today", "capacity"] as const;

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION_DEFAULTS.PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION_DEFAULTS.MAX_LIMIT)
    .default(PAGINATION_DEFAULTS.LIMIT),
  filter: z.enum(FILTER_VALUES).default("all"),
});

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

sessions.get("/", zValidator("query", querySchema), async (c) => {
  const { page, limit, filter } = c.req.valid("query");
  const skip = (page - 1) * limit;

  const where: Prisma.GameSessionWhereInput = {
    visibility: SessionVisibility.PUBLIC,
    status: { in: [GameSessionStatus.PUBLISHED, GameSessionStatus.ACTIVE, GameSessionStatus.LIVE] },
  };

  if (filter === "live") {
    where.status = GameSessionStatus.LIVE;
  }
  if (filter === "open") {
    where.status = { in: [GameSessionStatus.PUBLISHED, GameSessionStatus.ACTIVE] };
  }
  if (filter === "today") {
    where.startTime = { gte: startOfToday(), lte: endOfToday() };
  }

  const [totalMatching, sessions] = await Promise.all([
    prisma.gameSession.count({ where }),
    prisma.gameSession.findMany({
      where,
      orderBy: { startTime: "asc" },
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
    }),
  ]);

  let filtered = sessions.map((s) => ({
    id: s.id,
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

  if (filter === "open") {
    filtered = filtered.filter((s) => s.placesRemaining > 0);
  }
  if (filter === "capacity") {
    filtered = [...filtered].sort((a, b) => b.placesRemaining - a.placesRemaining);
  }

  const total = filter === "open" || filter === "capacity" ? filtered.length : totalMatching;
  const data = filtered.slice(skip, skip + limit);

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
