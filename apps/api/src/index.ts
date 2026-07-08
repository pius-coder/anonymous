import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve("../../.env") });
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "./middleware/requestId.js";
import { secureHeaders } from "./middleware/secureHeaders.js";
import { bodyLimit } from "./middleware/bodyLimit.js";
import health from "./routes/health.js";
import internalRounds from "./routes/internal/rounds.js";
import publicSessions from "./routes/public/sessions.js";
import publicSessionDetail from "./routes/public/session-detail.js";
import share from "./routes/share.js";
import auth from "./routes/auth.js";
import me from "./routes/me.js";
import adminSessions from "./routes/admin/sessions.js";
import registrations from "./routes/registrations.js";
import payments from "./routes/payments.js";
import adminPayments from "./routes/admin/payments.js";
import wallet from "./routes/wallet.js";
import adminWallets from "./routes/admin/wallets.js";
import lobby from "./routes/lobby.js";
import adminLobby from "./routes/admin/lobby.js";
import live from "./routes/live.js";
import adminLive from "./routes/admin/live.js";
import minigames from "./routes/minigames.js";
import adminMinigames from "./routes/admin/minigames.js";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());
app.use("*", requestId);
app.use("*", secureHeaders);
app.use("*", bodyLimit());

app.route("/health", health);
app.route("/internal", internalRounds);
app.route("/v1/public/sessions", publicSessions);
app.route("/v1/public/sessions", publicSessionDetail);
app.route("/v1/share", share);
app.route("/v1/auth", auth);
app.route("/v1/me", me);
app.route("/v1/admin/sessions", adminSessions);
app.route("/v1", registrations);
app.route("/v1", payments);
app.route("/v1/admin/payments", adminPayments);
app.route("/v1", wallet);
app.route("/v1/admin/wallets", adminWallets);
app.route("/v1", lobby);
app.route("/v1/admin", adminLobby);
app.route("/v1/live", live);
app.route("/v1/admin", adminLive);
app.route("/v1/minigames", minigames);
app.route("/v1/admin/minigames", adminMinigames);

const port = Number(process.env.PORT) || 3001;

console.log(`API server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
