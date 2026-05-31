const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function resolveServerMessageId(
  msg: Record<string, unknown> | null | undefined
): string | undefined {
  if (!msg || typeof msg !== 'object') return undefined;
  const raw = msg.messageId ?? msg.message_id ?? msg.id;
  if (raw == null) return undefined;
  const value = String(raw).trim();
  if (!value || value === 'undefined' || value === 'null') return undefined;
  return value;
}

export function isRatingMessageId(id: string | null | undefined): boolean {
  if (id == null || typeof id !== 'string') return false;
  return UUID_RE.test(id.trim());
}
