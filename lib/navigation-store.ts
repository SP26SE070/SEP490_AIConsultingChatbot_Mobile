let pendingConversationId: string | undefined = undefined;

export function setPendingConversation(id: string) {
  pendingConversationId = id;
}

export function getPendingConversation(): string | undefined {
  const id = pendingConversationId;
  pendingConversationId = undefined;
  return id;
}