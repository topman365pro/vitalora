function readEnv(name: string) {
  return process.env[name]?.trim();
}

export function getEnv(name: string, fallback?: string) {
  const value = readEnv(name);

  if (value) {
    return value;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Missing required environment variable: ${name}`);
}

export function getOptionalEnv(name: string) {
  return readEnv(name);
}

export function getSessionCookieName() {
  return getEnv("SESSION_COOKIE_NAME", "vitaloria_session");
}

export function getSessionTtlDays() {
  return Number(getEnv("SESSION_TTL_DAYS", "14"));
}
