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
import { COLORS } from '../lib/theme';
import { AppShell } from '../components/layout/AppShell';
import { useLanguageStore, translations } from '../lib/language-store';

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

export default function ChatbotScreen() {
  const { language } = useLanguageStore();
  const t = translations[language];
  
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const QUICK_PROMPTS = [
    language === 'vi' ? 'Chính sách nghỉ phép' : 'Leave policy',
    language === 'vi' ? 'Quy trình onboard' : 'Onboarding process',
    language === 'vi' ? 'Hỗ trợ IT' : 'IT Support',
  ];

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
          content: t.sessionExpired,
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

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput('');
    setSending(true);

    if (text) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }

    try {
      const result = await sendMessage(content, conversationId);
      if (result.conversationId && !conversationId) {
        setConversationId(result.conversationId);
      }
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessage.id
            ? {
                ...msg,
                content: result.answer,
                sources: result.sources,
                responseTimeMs: result.responseTimeMs,
              }
            : msg
        )
      );
    } catch (e: any) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessage.id
            ? { ...msg, content: t.error + ': ' + (e.message || 'Unknown error') }
            : msg
        )
      );
    } finally {
      setSending(false);
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }

  async function handleRate(messageId: string, rating: 'helpful' | 'not-helpful') {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, rating } : msg
      )
    );
    try {
      await rateMessage(messageId, rating);
    } catch (e) {
      console.warn('Rating failed:', e);
    }
  }

  const canSend = input.trim().length > 0 && !sending;

  return (
    <AppShell title={t.chat} subtitle={language === 'vi' ? 'Hỏi về chính sách, HR, IT...' : 'Ask about policies, HR, IT...'}>
      <View style={styles.chatBody}>
        <View style={styles.messagesWrapper}>
          {historyLoading ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.centerLoaderText}>{t.loading}</Text>
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
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="chatbubbles" size={40} color="#10b981" />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {language === 'vi' ? 'Xin chào!' : 'Hello!'}
                  </Text>
                  <Text style={styles.emptyText}>{t.askAnything}</Text>
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
                      <Ionicons name="sparkles" size={14} color="#10b981" />
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
                          <Ionicons name="library-outline" size={12} color="#64748b" />
                          <Text style={styles.sourcesTitle}> {t.sources}</Text>
                        </View>
                        {item.sources.slice(0, 3).map((source, idx) => (
                          <View key={idx} style={styles.sourceItem}>
                            <View style={styles.sourceTitleRow}>
                              <Ionicons name="document-text-outline" size={12} color="#10b981" />
                              <Text style={styles.sourceTitle} numberOfLines={1}>
                                {source.documentTitle}
                              </Text>
                            </View>
                            <Text style={styles.sourceSnippet} numberOfLines={2}>
                              {source.snippet}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Response time */}
                    {item.role === 'assistant' && item.responseTimeMs && (
                      <View style={styles.metaRow}>
                        <Ionicons name="time-outline" size={10} color="#64748b" />
                        <Text style={styles.responseTime}>
                          {t.responseTime}: {item.responseTimeMs}{t.ms}
                        </Text>
                      </View>
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
                              <Ionicons name="thumbs-up-outline" size={14} color="#10b981" />
                              <Text style={styles.rateBtnText}>{t.helpful}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.rateBtn}
                              onPress={() => handleRate(item.id, 'not-helpful')}
                            >
                              <Ionicons name="thumbs-down-outline" size={14} color="#64748b" />
                              <Text style={styles.rateBtnTextMuted}>{t.notHelpful}</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <View style={styles.ratedBadge}>
                            <Ionicons 
                              name={item.rating === 'helpful' ? "checkmark-circle" : "chatbox-ellipses"} 
                              size={14} 
                              color="#10b981" 
                            />
                            <Text style={styles.ratedText}>
                              {item.rating === 'helpful' ? t.thanks : t.feedbackReceived}
                            </Text>
                          </View>
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
                <Ionicons name="sparkles" size={14} color="#10b981" />
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#10b981" />
                <Text style={styles.typingText}>{t.thinking}</Text>
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
                placeholder={t.chatPlaceholder}
                placeholderTextColor="#64748b"
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
            <Text style={styles.charCount}>{input.length}/500</Text>
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
    color: '#94a3b8',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  promptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  promptChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  promptChipText: {
    fontSize: 13,
    color: '#10b981',
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  messageBubble: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '100%',
  },
  userBubble: {
    backgroundColor: '#10b981',
    borderBottomRightRadius: 6,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  assistantBubble: {
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#f1f5f9',
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
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  typingText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  inputSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 16,
    maxHeight: 120,
    paddingVertical: 8,
    lineHeight: 22,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
    shadowOpacity: 0,
    elevation: 0,
  },
  charCount: {
    textAlign: 'right',
    color: '#64748b',
    fontSize: 11,
    marginTop: 6,
    marginRight: 4,
  },
  sourcesSection: {
    marginTop: 8,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sourcesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sourcesTitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  sourceItem: {
    marginBottom: 8,
  },
  sourceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sourceTitle: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    flex: 1,
  },
  sourceSnippet: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    marginLeft: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  responseTime: {
    fontSize: 10,
    color: '#64748b',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  rateBtnText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  rateBtnTextMuted: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  ratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  ratedText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
});
