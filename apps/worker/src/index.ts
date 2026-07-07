import { Worker } from "bullmq";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
};

const worker = new Worker(
  "session-jeu",
  async (job) => {
    console.log(`Processing job ${job.id} of type ${job.name}`);
    return { success: true };
  },
  { connection },
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} has been completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`);
});

console.log("Worker started and listening for jobs...");
