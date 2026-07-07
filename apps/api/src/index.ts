import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "./middleware/requestId.js";
import { secureHeaders } from "./middleware/secureHeaders.js";
import { bodyLimit } from "./middleware/bodyLimit.js";
import health from "./routes/health.js";
import publicSessions from "./routes/public/sessions.js";
import publicSessionDetail from "./routes/public/session-detail.js";
import share from "./routes/share.js";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());
app.use("*", requestId);
app.use("*", secureHeaders);
app.use("*", bodyLimit());

app.route("/health", health);
app.route("/v1/public/sessions", publicSessions);
app.route("/v1/public/sessions", publicSessionDetail);
app.route("/v1/share", share);

const port = Number(process.env.PORT) || 3001;

console.log(`API server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
