const DEFAULT_REDIRECT = "/me/sessions";

export function safeInternalRedirect(value: string | null | undefined) {
  if (!value || !/^\/(?![\\/])/.test(value) || /%5c|\\/i.test(value)) {
    return DEFAULT_REDIRECT;
  }

  try {
    const origin = "https://session-jeu.local";
    const url = new URL(value, origin);
    if (url.origin !== origin) return DEFAULT_REDIRECT;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_REDIRECT;
  }
}
