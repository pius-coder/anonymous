import { serve } from "@hono/node-server";
import { Hono } from "hono";

export const app = new Hono();

app.get("/health", (c) =>
  c.json({
    status: "ok",
    service: "api",
    foundation: "v0.1",
  }),
);

const port = Number(process.env.PORT) || 3001;

if (process.env.NODE_ENV !== "test") {
  serve({ fetch: app.fetch, port });
  console.log(`API foundation listening on port ${port}`);
}

export default app;

