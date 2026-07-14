export { prisma } from "./prisma.js";

export * from "./repositories/index.js";

export type PersistenceFoundation = {
  foundation: "v0.1";
  database: "postgresql";
  orm: "prisma";
  models: "rebuilt";
};

export function getPersistenceFoundation(): PersistenceFoundation {
  return {
    foundation: "v0.1",
    database: "postgresql",
    orm: "prisma",
    models: "rebuilt",
  };
}
