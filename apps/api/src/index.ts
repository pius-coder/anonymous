import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import { getRequestListener } from "@hono/node-server";
import { Hono } from "hono";
import type { AppEnv } from "./app-env.js";
import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";
import { partyRouter } from "./routes/party.js";
import { paymentRouter } from "./routes/payment.js";
import { adminPartyRouter } from "./routes/admin/party.js";
import { adminPaymentRouter } from "./routes/admin/payment.js";
import { adminPreparationRouter } from "./routes/admin/preparation.js";
import { adminRoundRouter } from "./routes/admin/round.js";
import { preparationRouter } from "./routes/preparation.js";
import { liveRouter } from "./routes/live.js";
import { roundRouter } from "./routes/round.js";
import { registerRpcRoutes } from "./rpc/routes.js";

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
app.route("/v1/admin", adminRoundRouter);
app.route("/v1", preparationRouter);
app.route("/v1", liveRouter);
app.route("/v1", roundRouter);

const port = Number(process.env.PORT) || 3001;

if (process.env.NODE_ENV !== "test") {
  const honoListener = getRequestListener(app.fetch);
  const requestListener = connectNodeAdapter({
    routes: registerRpcRoutes,
    fallback: (request, response) => {
      void honoListener(
        request as IncomingMessage,
        response as ServerResponse<IncomingMessage>,
      );
    },
  });
  createServer(requestListener).listen(port);
  console.log(`API foundation (ConnectRPC + Hono) listening on port ${port}`);
}

export default app;
