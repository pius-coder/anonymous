import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, requireRole } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import { errorResponse, successResponse } from "../../lib/responses.js";
import {
  findMiniGameDefinition,
  listMiniGames,
  setMiniGameEnabled,
  validateMiniGameConfig,
} from "../../minigames/catalogue.js";

const adminMinigames = new Hono<{ Variables: AuthVariables }>();

const idParamsSchema = z.object({ id: z.string().min(1) });
const enableBodySchema = z.object({ enabled: z.boolean().default(true) });
const validateConfigBodySchema = z.object({
  key: z.string().min(1),
  version: z.number().int().positive().optional(),
  config: z.unknown(),
});

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

adminMinigames.use("*", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"));

const listDefinitionsHandler = async (c: Context<{ Variables: AuthVariables }>) => {
  const definitions = await listMiniGames();
  return successResponse(c, {
    definitions: definitions.map((definition) => ({
      id: definition.id,
      key: definition.key,
      name: definition.name,
      description: definition.description,
      family: definition.family,
      playerMode: definition.playerMode,
      resolverId: definition.resolverId,
      enabled: definition.enabled,
      version: definition.version,
      configSchema: definition.configSchema,
      defaultConfig: definition.defaultConfig,
      allowedActions: definition.allowedActions,
      antiCheatPolicy: definition.antiCheatPolicy,
      clientStateSchema: definition.clientStateSchema,
      uiCopy: definition.uiCopy,
    })),
  });
};

adminMinigames.get("/", listDefinitionsHandler);
adminMinigames.get("", listDefinitionsHandler);

adminMinigames.post(
  "/:id/enable",
  zValidator("param", idParamsSchema, validationHook),
  zValidator("json", enableBodySchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    try {
      const definition = await setMiniGameEnabled({
        id,
        enabled: body.enabled,
        adminUserId: user.id,
      });
      return successResponse(c, { definition });
    } catch {
      return errorResponse(c, 404, "MINIGAME_NOT_FOUND", "Mini-game definition not found");
    }
  },
);

adminMinigames.post(
  "/validate-config",
  zValidator("json", validateConfigBodySchema, validationHook),
  async (c) => {
    const body = c.req.valid("json");
    const definition = await findMiniGameDefinition({ key: body.key, version: body.version });
    if (!definition) {
      return errorResponse(c, 404, "MINIGAME_NOT_FOUND", "Mini-game definition not found");
    }
    if (!definition.enabled) {
      return errorResponse(c, 409, "MINIGAME_DISABLED", "Mini-game is disabled");
    }

    const result = validateMiniGameConfig({ key: definition.key, config: body.config });
    if (result.type === "unknown-minigame") {
      return errorResponse(c, 400, "INVALID_MINIGAME_CONFIG", "Unknown mini-game validator");
    }
    if (result.type === "invalid") {
      return errorResponse(c, 400, "INVALID_MINIGAME_CONFIG", "Invalid mini-game config", {
        issues: result.issues,
      });
    }

    return successResponse(c, { config: result.config });
  },
);

export default adminMinigames;
