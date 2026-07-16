/**
 * Contractual notification provider port.
 * Worker depends on this interface only — never on a concrete production SDK.
 */

export type NotificationMessage = {
  jobId: string;
  userId: string;
  channel: string;
  type: string;
  /** Opaque payload; must not be logged raw (may contain PII). */
  payload: unknown;
  correlationId: string;
};

export type SendSuccess = {
  ok: true;
  providerMessageId: string;
};

export type SendFailure = {
  ok: false;
  /** When true, the worker may retry with backoff. */
  retryable: boolean;
  errorCode: string;
  /** Safe, non-secret description for DeliveryLog / support. */
  errorMessage: string;
};

export type SendResult = SendSuccess | SendFailure;

export interface NotificationProvider {
  readonly name: string;
  send(message: NotificationMessage): Promise<SendResult>;
}
