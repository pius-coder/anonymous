export type WorkerFoundation = {
  service: "worker";
  foundation: "v0.1";
  jobs: "planned-only";
};

export function getWorkerFoundation(): WorkerFoundation {
  return {
    service: "worker",
    foundation: "v0.1",
    jobs: "planned-only",
  };
}

if (process.env.NODE_ENV !== "test") {
  console.log("Worker foundation ready. Legacy jobs intentionally removed.");
}

