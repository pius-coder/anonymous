export type PersistenceFoundation = {
  foundation: "v0.1";
  database: "postgresql";
  orm: "prisma";
  models: "to-be-rebuilt";
};

export function getPersistenceFoundation(): PersistenceFoundation {
  return {
    foundation: "v0.1",
    database: "postgresql",
    orm: "prisma",
    models: "to-be-rebuilt",
  };
}

