import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { sendMessage, getConversationHistory, rateMessage } from '../lib/api/chatbot';
import { getPendingConversation, consumeNewChatRequest } from '../lib/navigation-store';
import { getAccessToken } from '../lib/auth-store';
import { COLORS } from '../lib/theme';
import { AppShell } from '../components/layout/AppShell';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSourceDocument[];
  rating?: 'helpful' | 'not-helpful' | null;
  responseTimeMs?: number;
}

interface ChatSourceDocument {
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  similarityScore: number;
  snippet: string;
}

const QUICK_PROMPTS = [
  'Chính sách nghỉ phép',
  'Quy trình onboard',
  'Hỗ trợ IT',
];

export default function ChatbotScreen() {
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      if (consumeNewChatRequest()) {
        setConversationId(undefined);
        setMessages([]);
        return;
      }
      const convId = getPendingConversation();
      if (convId) {
        setConversationId(convId);
        setMessages([]);
        loadConversationHistory(convId);
      }
    }, [])
  );

  async function loadConversationHistory(convId: string) {
    try {
      setHistoryLoading(true);
      const data = await getConversationHistory(convId);
      if (data.messages && Array.isArray(data.messages)) {
        const loadedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id || msg.messageId || Date.now().toString(),
          role: msg.role === 'USER' ? 'user' : 'assistant',
          content: msg.content,
        }));
        setMessages(loadedMessages);
      }
    } catch (e: any) {
      console.warn('Failed to load conversation history:', e);
      if (e?.status === 401) {
        setMessages([{
          id: 'auth-error',
          role: 'assistant',
          content: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
        }]);
      }
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const data = await sendMessage(content, conversationId);
      if (data.conversationId) setConversationId(data.conversationId);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer || 'Xin lỗi, tôi không thể trả lời lúc này.',
        sources: data.sources ?? [],
        rating: null,
        responseTimeMs: data.responseTimeMs,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (e: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: e?.status === 401 
          ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' 
          : 'Đã xảy ra lỗi. Vui lòng thử lại.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  }

  async function handleRate(messageId: string, rating: 'helpful' | 'not-helpful') {
    try {
      await rateMessage(messageId, rating);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, rating } : msg
        )
      );
    } catch (e) {
      console.warn('Failed to rate message:', e);
    }
  }

  const canSend = input.trim().length > 0 && !sending;

  return (
    <AppShell
      title="Trò chuyện AI"
      subtitle="Hỏi về chính sách, HR, IT..."
    >
      <View style={styles.chatBody}>
        <View style={styles.messagesWrapper}>
          {historyLoading ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.centerLoaderText}>Đang tải hội thoại...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item.id}
              style={styles.messageList}
              contentContainerStyle={[
                styles.messageListContent,
                messages.length === 0 && styles.messageListEmpty,
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onContentSizeChange={() => {
                if (flatListRef.current) {
                  flatListRef.current.scrollToEnd({ animated: true });
                }
              }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="chatbubbles" size={40} color={COLORS.accent} />
                  </View>
                  <Text style={styles.emptyTitle}>Xin chào!</Text>
                  <Text style={styles.emptyText}>
                    Hỏi tôi về chính sách công ty, HR, IT hoặc chọn gợi ý bên dưới.
                  </Text>
                  <View style={styles.promptRow}>
                    {QUICK_PROMPTS.map(prompt => (
                      <TouchableOpacity
                        key={prompt}
                        style={styles.promptChip}
                        onPress={() => handleSend(prompt)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.promptChipText}>{prompt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              }
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.messageRow,
                    item.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant,
                  ]}
                >
                  {item.role === 'assistant' && (
                    <View style={styles.avatar}>
                      <Ionicons name="sparkles" size={14} color={COLORS.accent} />
                    </View>
                  )}
                  <View style={styles.messageColumn}>
                    <View
                      style={[
                        styles.messageBubble,
                        item.role === 'user' ? styles.userBubble : styles.assistantBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          item.role === 'user' ? styles.userText : styles.assistantText,
                        ]}
                      >
                        {item.content}
                      </Text>
                    </View>

                    {/* RAG Sources */}
                    {item.role === 'assistant' && item.sources && item.sources.length > 0 && (
                      <View style={styles.sourcesSection}>
                        <View style={styles.sourcesTitleRow}>
                          <Ionicons name="library-outline" size={12} color={COLORS.textMuted} />
                          <Text style={styles.sourcesTitle}> Nguồn tham khảo</Text>
                        </View>
                        {item.sources.slice(0, 3).map((source, idx) => (
                          <View key={idx} style={styles.sourceItem}>
                            <Text style={styles.sourceTitle} numberOfLines={1}>
                              📄 {source.documentTitle}
                            </Text>
                            <Text style={styles.sourceSnippet} numberOfLines={2}>
                              {source.snippet}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Response time */}
                    {item.role === 'assistant' && item.responseTimeMs && (
                      <Text style={styles.responseTime}>
                        Phản hồi trong {item.responseTimeMs}ms
                      </Text>
                    )}

                    {/* Rating */}
                    {item.role === 'assistant' && item.id && (
                      <View style={styles.ratingRow}>
                        {item.rating === null ? (
                          <>
                            <TouchableOpacity
                              style={styles.rateBtn}
                              onPress={() => handleRate(item.id, 'helpful')}
                            >
                              <Ionicons name="thumbs-up-outline" size={14} color={COLORS.accent} />
                              <Text style={styles.rateBtnText}>Hữu ích</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.rateBtn}
                              onPress={() => handleRate(item.id, 'not-helpful')}
                            >
                              <Ionicons name="thumbs-down-outline" size={14} color={COLORS.textMuted} />
                              <Text style={styles.rateBtnTextMuted}>Không</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <Text style={styles.ratedText}>
                            {item.rating === 'helpful' ? '👍 Cảm ơn!' : '📝 Đã ghi nhận'}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              )}
            />
          )}

          {sending && (
            <View style={styles.typingRow}>
              <View style={styles.avatar}>
                <Ionicons name="sparkles" size={14} color={COLORS.accent} />
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color={COLORS.accent} />
                <Text style={styles.typingText}>Đang suy nghĩ...</Text>
              </View>
            </View>
          )}
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.inputSection}>
            <View style={styles.inputCard}>
              <TextInput
                style={styles.input}
                placeholder="Nhập câu hỏi của bạn..."
                placeholderTextColor={COLORS.textDim}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={500}
              />
              <Pressable
                style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
                onPress={() => handleSend()}
                disabled={!canSend}
              >
                <Ionicons name="arrow-up" size={20} color="#fff" />
              </Pressable>
            </View>
            <Text style={styles.charCount}>{input.length}/500 ký tự</Text>
          </View>
        </KeyboardAvoidingView>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  chatBody: {
    flex: 1,
  },
  messagesWrapper: {
    flex: 1,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 4,
  },
  messageListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  centerLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  centerLoaderText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  promptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  promptChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  promptChipText: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '92%',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
  },
  messageRowAssistant: {
    alignSelf: 'flex-start',
  },
  messageColumn: {
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  messageBubble: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
    maxWidth: '100%',
  },
  userBubble: {
    backgroundColor: COLORS.userBubble,
    borderBottomRightRadius: 6,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  assistantBubble: {
    backgroundColor: COLORS.assistantBubble,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: COLORS.text,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: COLORS.assistantBubble,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typingText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  inputSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    maxHeight: 120,
    paddingVertical: 10,
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.surfaceLight,
    opacity: 0.6,
  },
  charCount: {
    textAlign: 'right',
    color: COLORS.textDim,
    fontSize: 11,
    marginTop: 6,
    marginRight: 4,
  },
  sourcesSection: {
    marginTop: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sourcesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sourcesTitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  sourceItem: {
    marginBottom: 6,
  },
  sourceTitle: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
    marginBottom: 2,
  },
  sourceSnippet: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  responseTime: {
    fontSize: 10,
    color: COLORS.textDim,
    marginTop: 4,
    marginLeft: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginLeft: 4,
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rateBtnText: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '500',
  },
  rateBtnTextMuted: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  ratedText: {
    fontSize: 12,
    color: COLORS.textDim,
    fontStyle: 'italic',
  },
});
