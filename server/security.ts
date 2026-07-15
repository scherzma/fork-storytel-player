import path from "path";

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY = /(?:authorization|cookie|email|firebase|jwt|pass(?:word)?|pwd|refresh|secret|session|token|uid)/i;
const SENSITIVE_QUERY_PARAMETER = /([?&](?:api[_-]?key|authorization|cookie|email|jwt|pass(?:word)?|pwd|refresh[_-]?token|secret|session|token|uid)=)[^&#\s]*/gi;
const BEARER_TOKEN = /(bearer\s+)[A-Za-z0-9._~+\/-]+=*/gi;

export function sanitizeLogText(value: string): string {
  return value
    .replace(SENSITIVE_QUERY_PARAMETER, `$1${REDACTED}`)
    .replace(BEARER_TOKEN, `$1${REDACTED}`);
}

export function sanitizeLogValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") return sanitizeLogText(value);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : sanitizeLogValue(item, seen),
    ]),
  );
}

export function resolveBookFile(downloadsDirectory: string, bookId: string): string {
  const normalizedBookId = normalizeBookIdentifier(bookId);

  const base = path.resolve(downloadsDirectory);
  const target = path.resolve(base, `${normalizedBookId}.mp3`);
  if (path.dirname(target) !== base) {
    throw new Error("Invalid book identifier");
  }
  return target;
}

export function normalizeBookIdentifier(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new Error("Invalid book identifier");
  }
  return value;
}

export function normalizeCatalogQuery(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Invalid catalog query");
  }

  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > 100) {
    throw new Error("Invalid catalog query");
  }
  if (/[\u0000-\u001F\u007F]/.test(normalized)) {
    throw new Error("Invalid catalog query");
  }
  return normalized;
}
