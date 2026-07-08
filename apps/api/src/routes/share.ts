import { Hono } from "hono";
import { prisma, GameSessionStatus } from "@session-jeu/db";

const share = new Hono();

share.get("/:token", async (c) => {
  const token = c.req.param("token");

  const link = await prisma.shareLink.findUnique({
    where: { token },
    select: {
      id: true,
      sessionId: true,
      clickCount: true,
      session: {
        select: {
          code: true,
          visibility: true,
          status: true,
        },
      },
    },
  });

  if (!link || !link.session) {
    return c.json(
      {
        success: false,
        error: {
          code: "LINK_NOT_FOUND",
          message: "Share link not found",
        },
      },
      404,
    );
  }

  const session = link.session;

  if (session.visibility === "PRIVATE") {
    return c.json(
      {
        success: false,
        error: {
          code: "SESSION_PRIVATE",
          message: "This session is not accessible via share link",
        },
      },
      403,
    );
  }

  if (
    session.status === GameSessionStatus.COMPLETED ||
    session.status === GameSessionStatus.CANCELLED
  ) {
    return c.json(
      {
        success: false,
        error: {
          code: "SESSION_CLOSED",
          message: "This session is no longer active",
        },
      },
      410,
    );
  }

  await prisma.$transaction([
    prisma.shareLink.update({
      where: { id: link.id },
      data: { clickCount: { increment: 1 } },
    }),
    prisma.auditLog.create({
      data: {
        action: "share.link-opened",
        entity: "ShareLink",
        entityId: link.id,
      },
    }),
  ]);

  return c.redirect(`/session/${session.code}`, 302);
});

export default share;
