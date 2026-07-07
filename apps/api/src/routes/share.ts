import { Hono } from "hono";
import { prisma } from "@session-jeu/db";

const share = new Hono();

share.get("/:token", async (c) => {
  const token = c.req.param("token");

  const session = await prisma.gameSession.findUnique({
    where: { code: token },
    select: { code: true, isPublic: true },
  });

  if (!session) {
    return c.json(
      {
        success: false,
        error: {
          code: "LINK_NOT_FOUND",
          message: "Share link not found",
        },
      },
      404
    );
  }

  return c.redirect(`/session/${session.code}`, 302);
});

export default share;
