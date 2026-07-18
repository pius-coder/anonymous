"use client";

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

const CONSENT_KEY = "noya.analytics.consent";

export function hasAnalyticsConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

export function trackAnalyticsEvent(event: string, payload: AnalyticsPayload = {}) {
  if (!hasAnalyticsConsent()) return;
  window.dispatchEvent(
    new CustomEvent("noya:analytics", {
      detail: {
        event,
        payload,
        occurredAt: new Date().toISOString(),
      },
    }),
  );
}
