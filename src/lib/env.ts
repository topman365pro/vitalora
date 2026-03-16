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

export function getFirebaseClientConfig() {
  return {
    apiKey: getEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: getEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: getEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: getEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: getEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  };
}
