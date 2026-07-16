import { redactForLog, redactText } from "@session-jeu/whatsapp-gateway";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown> & {
  correlationId?: string;
  jobName?: string;
  jobId?: string;
  attempt?: number;
};

function emit(level: LogLevel, message: string, fields: LogFields = {}): void {
  const safeFields = redactForLog(fields) as Record<string, unknown>;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: "worker",
    msg: redactText(message),
    ...safeFields,
  });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const log = {
  debug: (message: string, fields?: LogFields) => emit("debug", message, fields),
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields),
};

export function newCorrelationId(prefix = "w"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
