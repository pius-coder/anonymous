import { Hono } from "hono";
import { prisma } from "@session-jeu/db";
import { errorResponse, successResponse } from "../lib/responses.js";

const minigames = new Hono();

minigames.get("/:id/schema", async (c) => {
  const id = c.req.param("id");
  const definition = await prisma.miniGameDefinition.findUnique({
    where: { id },
  });

  if (!definition || !definition.enabled) {
    return errorResponse(c, 404, "MINIGAME_NOT_FOUND", "Mini-game definition not found");
  }

  return successResponse(c, {
    definition: {
      id: definition.id,
      key: definition.key,
      name: definition.name,
      description: definition.description,
      family: definition.family,
      playerMode: definition.playerMode,
      resolverId: definition.resolverId,
      version: definition.version,
      configSchema: definition.configSchema,
      defaultConfig: definition.defaultConfig,
      allowedActions: definition.allowedActions,
      clientStateSchema: definition.clientStateSchema,
      uiCopy: definition.uiCopy,
    },
  });
});

export default minigames;
