import { SessionRegistrationStatus } from "@session-jeu/db";

export const CAPACITY_REGISTRATION_STATUSES = [
  SessionRegistrationStatus.PAYMENT_PENDING,
  SessionRegistrationStatus.PAID,
  SessionRegistrationStatus.CHECKED_IN,
  SessionRegistrationStatus.IN_ROOM,
] as const;

export const PAID_ACCESS_REGISTRATION_STATUSES = [
  SessionRegistrationStatus.PAID,
  SessionRegistrationStatus.CHECKED_IN,
  SessionRegistrationStatus.IN_ROOM,
] as const;
