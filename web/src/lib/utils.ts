export function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  const timestamp = Date.now().toString(16);
  const random = Math.random().toString(16).slice(2, 14);
  return `${timestamp}-${random}`;
}

export function asTextContent(content: Record<string, unknown> | null | undefined): string {
  if (!content) {
    return "";
  }

  const text = content.text;
  return typeof text === "string" ? text : "";
}

export function toIsoLocal(dateIso?: string | null): string {
  if (!dateIso) {
    return "";
  }

  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
}
