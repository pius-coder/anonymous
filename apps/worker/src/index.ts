import { Worker } from "bullmq";
import {
  processRegistrationExpiration,
  type RegistrationExpirationJobData,
} from "./registrationExpiration.js";
import {
  processPaymentReconciliation,
  type PaymentReconciliationJobData,
} from "./paymentReconciliation.js";
import { processCheckInDeadline, type CheckInDeadlineJobData } from "./checkInDeadline.js";
import { processRoundDeadline, type RoundDeadlineJobData } from "./roundDeadline.js";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
};

const worker = new Worker(
  "session-jeu",
  async (job) => {
    console.log(`Processing job ${job.id} of type ${job.name}`);
    if (job.name === "registration.expire") {
      return processRegistrationExpiration(job.data as RegistrationExpirationJobData);
    }
    if (job.name === "payment.reconcile") {
      return processPaymentReconciliation(job.data as PaymentReconciliationJobData);
    }
    if (job.name === "checkin.deadline") {
      return processCheckInDeadline(job.data as CheckInDeadlineJobData);
    }
    if (job.name === "round.deadline") {
      return processRoundDeadline(job.data as RoundDeadlineJobData);
    }
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
