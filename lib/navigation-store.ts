let pendingConversationId: string | undefined = undefined;
let newChatRequested = false;

export function setPendingConversation(id: string) {
  pendingConversationId = id;
}

export function getPendingConversation(): string | undefined {
  const id = pendingConversationId;
  pendingConversationId = undefined;
  return id;
}

export function requestNewChat() {
  newChatRequested = true;
}

export function consumeNewChatRequest(): boolean {
  if (!newChatRequested) return false;
  newChatRequested = false;
  return true;
}