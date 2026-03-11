import { clsx } from "clsx";

export function cn(...values: Array<string | false | null | undefined>) {
  return clsx(values);
}

export function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatMetric(
  value: number | null | undefined,
  unit: string,
  fractionDigits = 0,
) {
  if (value === null || value === undefined) {
    return "--";
  }

  return `${value.toFixed(fractionDigits)} ${unit}`;
}

export function formatTimestamp(value: string | Date | null | undefined) {
  if (!value) {
    return "--";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function titleFromPrompt(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "New conversation";
  }

  return trimmed.length > 48 ? `${trimmed.slice(0, 45)}...` : trimmed;
}
