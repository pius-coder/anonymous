import { z } from "zod";

export type FieldErrors = Record<string, string[]>;

function pushFieldError(errors: FieldErrors, path: string, message: string) {
  if (!errors[path]) errors[path] = [];
  errors[path].push(message);
}

export function zodFieldErrors(error: unknown): FieldErrors | undefined {
  if (!(error instanceof z.ZodError)) return undefined;

  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.length ? issue.path.join(".") : "_form";
    pushFieldError(fields, path, issue.message);
  }

  return Object.keys(fields).length ? fields : undefined;
}

export function validationErrorDetails(error: unknown) {
  const fields = zodFieldErrors(error);
  return fields ? { fields, ...fields } : undefined;
}
