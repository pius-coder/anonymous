import type { NotificationMessage, NotificationProvider, SendResult } from "./types.js";

/**
 * Injectable contractual fake for tests and local development.
 * Production must not use this class as a silent fallback.
 */
export class FakeNotificationProvider implements NotificationProvider {
  readonly name = "fake";

  /** Successful deliveries (after any programmed failures). */
  readonly sent: NotificationMessage[] = [];

  /** Fail the next N send attempts. */
  failNext = 0;

  /** When failing, whether the failure is retryable. */
  failRetryable = true;

  failCode = "FAKE_PROVIDER_ERROR";
  failMessage = "Simulated provider failure";

  async send(message: NotificationMessage): Promise<SendResult> {
    if (this.failNext > 0) {
      this.failNext -= 1;
      return {
        ok: false,
        retryable: this.failRetryable,
        errorCode: this.failCode,
        errorMessage: this.failMessage,
      };
    }

    this.sent.push(message);
    return {
      ok: true,
      providerMessageId: `fake-${message.jobId}-${this.sent.length}`,
    };
  }

  reset(): void {
    this.sent.length = 0;
    this.failNext = 0;
    this.failRetryable = true;
    this.failCode = "FAKE_PROVIDER_ERROR";
    this.failMessage = "Simulated provider failure";
  }
}
