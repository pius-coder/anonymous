import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { AppEnv } from "./app-env.js";
import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";
import { partyRouter } from "./routes/party.js";
import { paymentRouter } from "./routes/payment.js";
import { adminPartyRouter } from "./routes/admin/party.js";
import { adminPaymentRouter } from "./routes/admin/payment.js";
import { adminPreparationRouter } from "./routes/admin/preparation.js";
import { preparationRouter } from "./routes/preparation.js";
import { liveRouter } from "./routes/live.js";

export const app = new Hono<AppEnv>();

app.get("/health", (c) =>
  c.json({
    status: "ok",
    service: "api",
    foundation: "v0.1",
  }),
);

app.route("/v1/auth", authRouter);
app.route("/v1", meRouter);
app.route("/v1", partyRouter);
app.route("/v1", paymentRouter);
app.route("/v1/admin", adminPartyRouter);
app.route("/v1/admin", adminPaymentRouter);
app.route("/v1/admin", adminPreparationRouter);
app.route("/v1", preparationRouter);
app.route("/v1", liveRouter);

const port = Number(process.env.PORT) || 3001;

if (process.env.NODE_ENV !== "test") {
  serve({ fetch: app.fetch, port });
  console.log(`API foundation listening on port ${port}`);
}

export default app;
